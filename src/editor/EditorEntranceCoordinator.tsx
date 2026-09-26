import { useLayoutEffect } from 'react';
import {
  collectEditorEntranceTargets,
  DIRECT_LOAD_FAILSAFE_MS,
  DIRECT_LOAD_RENDER_EVENT,
  DIRECT_LOAD_SHELL_CLEAR_MS,
  EDITOR_CHROME_EXIT_REQUEST_EVENT,
  EDITOR_EXIT_EASING,
  editorEntranceDelay,
  editorEntranceDistances,
  editorExitDelay,
  editorExitDuration,
  editorExitKeyframes,
  editorSpringKeyframes,
  editorSpringProfile,
  FIELD_SHELL_SELECTOR,
  readFieldDashboardLayerState,
  type EditorChromeExitRequestDetail,
  type EditorEntranceRole,
  type EditorEntranceTarget,
  type FieldDashboardLayerState,
} from './editor-entrance';
import { trace } from '@/shared/debug-trace';

type PreparedTarget = EditorEntranceTarget & {
  previous: {
    translate: string;
    opacity: string;
    pointerEvents: string;
    willChange: string;
  };
};

function captureTarget(target: EditorEntranceTarget): PreparedTarget {
  const { element } = target;
  return {
    ...target,
    previous: {
      translate: element.style.translate,
      opacity: element.style.opacity,
      pointerEvents: element.style.pointerEvents,
      willChange: element.style.willChange,
    },
  };
}

function prepareEntranceTarget(
  target: EditorEntranceTarget,
  startDistancePx: number,
): PreparedTarget {
  const prepared = captureTarget(target);
  const { element, role } = prepared;

  element.style.translate = role === 'bottom'
    ? `0 ${startDistancePx}px`
    : `${startDistancePx}px 0`;
  element.style.opacity = '0.96';
  element.style.pointerEvents = 'none';
  element.style.willChange = prepared.previous.willChange
    ? `${prepared.previous.willChange}, translate, opacity`
    : 'translate, opacity';

  return prepared;
}

function prepareExitTarget(target: EditorEntranceTarget): PreparedTarget {
  const prepared = captureTarget(target);
  const { element } = prepared;
  element.style.pointerEvents = 'none';
  element.style.willChange = prepared.previous.willChange
    ? `${prepared.previous.willChange}, translate`
    : 'translate';
  return prepared;
}

function restoreTarget(target: PreparedTarget): void {
  target.element.style.translate = target.previous.translate;
  target.element.style.opacity = target.previous.opacity;
  target.element.style.pointerEvents = target.previous.pointerEvents;
  target.element.style.willChange = target.previous.willChange;
}

function holdTargetOffscreen(target: PreparedTarget, distancePx: number): void {
  target.element.style.translate = target.role === 'bottom'
    ? `0 ${distancePx}px`
    : `${distancePx}px 0`;
  target.element.style.opacity = target.previous.opacity || '1';
  target.element.style.pointerEvents = 'none';
  target.element.style.willChange = target.previous.willChange;
}

function nextPaint(callback: () => void): number {
  return requestAnimationFrame(() => requestAnimationFrame(callback));
}

export default function EditorEntranceCoordinator() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const shell = document.querySelector<HTMLElement>(FIELD_SHELL_SELECTOR);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    if (reducedMotion) {
      root.dataset.editorEntranceState = 'settled';
      trace.action('editor-entrance:reduced-motion', {});
      return;
    }

    let prepared: PreparedTarget[] = [];
    let animations: Animation[] = [];
    let timers: number[] = [];
    let frames: number[] = [];
    let cycle = 0;
    let running = false;
    let directLoadArmed = false;
    let directLoadStarted = false;
    let renderCompleteSeen = false;
    let exitPromise: Promise<void> | null = null;
    let resolveExit: (() => void) | null = null;
    let lastDashboardState: FieldDashboardLayerState | null = readFieldDashboardLayerState(document);

    const clearScheduled = () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers = [];
      for (const frame of frames) cancelAnimationFrame(frame);
      frames = [];
    };

    const finishPendingExit = () => {
      if (!resolveExit) return;
      const resolve = resolveExit;
      resolveExit = null;
      exitPromise = null;
      resolve();
    };

    const cancelMotion = (restore = true) => {
      clearScheduled();
      for (const animation of animations) {
        animation.onfinish = null;
        animation.oncancel = null;
        animation.cancel();
      }
      animations = [];
      if (restore) {
        for (const target of prepared) restoreTarget(target);
      }
      prepared = [];
      running = false;
      finishPendingExit();
    };

    const prepareEntrance = () => {
      if (prepared.length > 0 || running) return true;

      const targets = collectEditorEntranceTargets(document);
      if (targets.length === 0) {
        root.dataset.editorEntranceState = 'settled';
        return false;
      }

      const distances = editorEntranceDistances(
        targets,
        window.innerWidth,
        window.innerHeight,
      );

      prepared = targets.map((target) => prepareEntranceTarget(target, distances[target.role]));
      root.dataset.editorEntranceState = 'prepared';
      trace.action('editor-entrance:prepared', {
        cycle,
        dashboardState: readFieldDashboardLayerState(document),
        directLoadArmed,
        targets: prepared.map(({ role, element }) => ({
          role,
          surface: element.dataset.workspaceIsland ?? element.id ?? element.dataset.editorPanel ?? 'chrome',
        })),
      });
      return true;
    };

    const runEntrance = () => {
      if (running) return;
      if (!prepareEntrance()) return;

      running = true;
      root.dataset.editorEntranceState = 'entering';
      const currentCycle = cycle;
      const distances = editorEntranceDistances(
        prepared,
        window.innerWidth,
        window.innerHeight,
      );
      const settled = new Set<HTMLElement>();

      trace.action('editor-entrance:entering', {
        cycle: currentCycle,
        dashboardState: readFieldDashboardLayerState(document),
        directLoad: directLoadArmed,
      });

      const settleOne = (target: PreparedTarget) => {
        if (settled.has(target.element)) return;
        settled.add(target.element);
        restoreTarget(target);
        if (settled.size >= prepared.length && currentCycle === cycle) {
          prepared = [];
          animations = [];
          timers = [];
          frames = [];
          running = false;
          root.dataset.editorEntranceState = 'settled';
          trace.action('editor-entrance:settled', { cycle: currentCycle });
        }
      };

      for (const target of prepared) {
        const timer = window.setTimeout(() => {
          if (currentCycle !== cycle) return;

          if (typeof target.element.animate !== 'function') {
            settleOne(target);
            return;
          }

          const profile = editorSpringProfile(target.role);
          const animation = target.element.animate(
            editorSpringKeyframes(target.role, distances[target.role]),
            {
              duration: profile.durationMs,
              easing: 'linear',
              fill: 'both',
            },
          );

          animations.push(animation);
          animation.onfinish = () => {
            animation.onfinish = null;
            animation.oncancel = null;
            animation.cancel();
            settleOne(target);
          };
          animation.oncancel = () => settleOne(target);
        }, editorEntranceDelay(target.role));

        timers.push(timer);
      }
    };

    const runEntranceAfterPaint = () => {
      const currentCycle = cycle;
      const frame = nextPaint(() => {
        if (currentCycle !== cycle) return;
        runEntrance();
      });
      frames.push(frame);
    };

    const beginNewRevealCycle = () => {
      cycle += 1;
      cancelMotion(true);
      directLoadArmed = false;
      directLoadStarted = false;
      prepareEntrance();
    };

    const runExit = (): Promise<void> => {
      if (exitPromise) return exitPromise;

      cycle += 1;
      directLoadArmed = false;
      directLoadStarted = false;
      cancelMotion(true);

      const targets = collectEditorEntranceTargets(document);
      if (targets.length === 0) {
        root.dataset.editorEntranceState = 'exited';
        return Promise.resolve();
      }

      const distances = editorEntranceDistances(
        targets,
        window.innerWidth,
        window.innerHeight,
      );
      prepared = targets.map(prepareExitTarget);
      running = true;
      root.dataset.editorEntranceState = 'exiting';

      trace.action('editor-entrance:exiting', {
        cycle,
        targets: prepared.map(({ role, element }) => ({
          role,
          surface: element.dataset.workspaceIsland ?? element.id ?? element.dataset.editorPanel ?? 'chrome',
        })),
      });

      const currentCycle = cycle;
      const finished = new Set<HTMLElement>();

      exitPromise = new Promise<void>((resolve) => {
        resolveExit = resolve;

        const finishOne = (target: PreparedTarget) => {
          if (finished.has(target.element)) return;
          finished.add(target.element);
          holdTargetOffscreen(target, distances[target.role]);

          if (finished.size >= prepared.length && currentCycle === cycle) {
            animations = [];
            timers = [];
            running = false;
            root.dataset.editorEntranceState = 'exited';
            trace.action('editor-entrance:exited', { cycle: currentCycle });
            finishPendingExit();
          }
        };

        for (const target of prepared) {
          const timer = window.setTimeout(() => {
            if (currentCycle !== cycle) {
              finishOne(target);
              return;
            }

            if (typeof target.element.animate !== 'function') {
              finishOne(target);
              return;
            }

            const animation = target.element.animate(
              editorExitKeyframes(target.role, distances[target.role]),
              {
                duration: editorExitDuration(target.role),
                easing: EDITOR_EXIT_EASING,
                fill: 'both',
              },
            );

            animations.push(animation);
            animation.onfinish = () => {
              animation.onfinish = null;
              animation.oncancel = null;
              animation.cancel();
              finishOne(target);
            };
            animation.oncancel = () => finishOne(target);
          }, editorExitDelay(target.role));

          timers.push(timer);
        }
      });

      return exitPromise;
    };

    const startDirectLoadAfterShellClears = () => {
      if (!directLoadArmed || directLoadStarted) return;
      directLoadStarted = true;
      const timer = window.setTimeout(() => {
        if (!directLoadArmed) return;
        trace.action('editor-entrance:direct-load-shell-cleared', {
          renderCompleteSeen,
        });
        runEntranceAfterPaint();
      }, DIRECT_LOAD_SHELL_CLEAR_MS);
      timers.push(timer);
    };

    const onRenderComplete = () => {
      renderCompleteSeen = true;
      if (!directLoadArmed) return;
      trace.action('editor-entrance:direct-load-render-complete', {});
      startDirectLoadAfterShellClears();
    };

    const onExitRequest = (event: Event) => {
      const detail = (event as CustomEvent<EditorChromeExitRequestDetail>).detail;
      if (!detail?.waitUntil) return;
      detail.waitUntil(runExit());
    };

    const handleDashboardState = (state: FieldDashboardLayerState | null) => {
      const previous = lastDashboardState;
      lastDashboardState = state;

      // Dashboard and editor now overlap their ownership handoff instead of
      // exposing a bare intermediate Canvas. As Dashboard starts leaving,
      // prepare editor chrome offscreen and begin its entrance after two paints
      // while the Dashboard slabs are still moving above it. The hidden state
      // remains a fallback boundary, not the normal start signal.
      if (state === 'hiding' && previous !== 'hiding') {
        beginNewRevealCycle();
        runEntranceAfterPaint();
        return;
      }

      if (state === 'hidden' && previous !== 'hidden') {
        directLoadArmed = false;
        directLoadStarted = false;
        if (cycle === 0) cycle = 1;
        if (!prepared.length && !running) prepareEntrance();
        if (!running) runEntrance();
      }
    };

    window.addEventListener(DIRECT_LOAD_RENDER_EVENT, onRenderComplete);
    document.addEventListener(EDITOR_CHROME_EXIT_REQUEST_EVENT, onExitRequest);

    if (!shell) {
      cycle = 1;
      directLoadArmed = true;
      prepareEntrance();
    } else if (lastDashboardState === 'hidden') {
      cycle = 1;
      directLoadArmed = true;
      root.dataset.editorEntranceState = 'waiting-canvas';
      prepareEntrance();

      const fallback = window.setTimeout(() => {
        if (!directLoadArmed || directLoadStarted) return;
        trace.action('editor-entrance:direct-load-failsafe', {});
        startDirectLoadAfterShellClears();
      }, DIRECT_LOAD_FAILSAFE_MS);
      timers.push(fallback);
    } else {
      root.dataset.editorEntranceState = 'waiting-dashboard';
    }

    const observer = shell ? new MutationObserver(() => {
      handleDashboardState(readFieldDashboardLayerState(document));
    }) : null;

    observer?.observe(shell!, {
      attributes: true,
      attributeFilter: ['data-dashboard-state'],
    });

    return () => {
      observer?.disconnect();
      window.removeEventListener(DIRECT_LOAD_RENDER_EVENT, onRenderComplete);
      document.removeEventListener(EDITOR_CHROME_EXIT_REQUEST_EVENT, onExitRequest);
      cycle += 1;
      directLoadArmed = false;
      cancelMotion(true);
      delete root.dataset.editorEntranceState;
    };
  }, []);

  return null;
}
