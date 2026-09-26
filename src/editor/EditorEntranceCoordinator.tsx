import { useLayoutEffect } from 'react';
import {
  collectEditorEntranceTargets,
  DIRECT_LOAD_FAILSAFE_MS,
  DIRECT_LOAD_RENDER_EVENT,
  DIRECT_LOAD_SHELL_CLEAR_MS,
  editorEntranceDelay,
  editorEntranceDistances,
  editorSpringKeyframes,
  editorSpringProfile,
  FIELD_SHELL_SELECTOR,
  readFieldDashboardLayerState,
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

function prepareTarget(
  target: EditorEntranceTarget,
  startDistancePx: number,
): PreparedTarget {
  const { element, role } = target;
  const previous = {
    translate: element.style.translate,
    opacity: element.style.opacity,
    pointerEvents: element.style.pointerEvents,
    willChange: element.style.willChange,
  };

  element.style.translate = role === 'bottom'
    ? `0 ${startDistancePx}px`
    : `${startDistancePx}px 0`;
  element.style.opacity = '0.96';
  element.style.pointerEvents = 'none';
  element.style.willChange = previous.willChange
    ? `${previous.willChange}, translate, opacity`
    : 'translate, opacity';

  return { ...target, previous };
}

function restoreTarget(target: PreparedTarget): void {
  target.element.style.translate = target.previous.translate;
  target.element.style.opacity = target.previous.opacity;
  target.element.style.pointerEvents = target.previous.pointerEvents;
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
    let lastDashboardState: FieldDashboardLayerState | null = readFieldDashboardLayerState(document);

    const clearScheduled = () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers = [];
      for (const frame of frames) cancelAnimationFrame(frame);
      frames = [];
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
    };

    const prepare = () => {
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

      prepared = targets.map((target) => prepareTarget(target, distances[target.role]));
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

    const run = () => {
      if (running) return;
      if (!prepare()) return;

      running = true;
      root.dataset.editorEntranceState = 'entering';
      const currentCycle = cycle;
      const distances = editorEntranceDistances(
        prepared,
        window.innerWidth,
        window.innerHeight,
      );
      let settled = 0;

      trace.action('editor-entrance:entering', {
        cycle: currentCycle,
        dashboardState: readFieldDashboardLayerState(document),
        directLoad: directLoadArmed,
      });

      const settleOne = (target: PreparedTarget) => {
        restoreTarget(target);
        settled += 1;
        if (settled >= prepared.length && currentCycle === cycle) {
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
            animation.cancel();
            settleOne(target);
          };
          animation.oncancel = () => {
            if (currentCycle === cycle) settleOne(target);
          };
        }, editorEntranceDelay(target.role));

        timers.push(timer);
      }
    };

    const runAfterPaint = () => {
      const frame = nextPaint(run);
      frames.push(frame);
    };

    const beginNewRevealCycle = () => {
      cycle += 1;
      cancelMotion(true);
      directLoadArmed = false;
      directLoadStarted = false;
      prepare();
    };

    const startDirectLoadAfterShellClears = () => {
      if (!directLoadArmed || directLoadStarted) return;
      directLoadStarted = true;
      const timer = window.setTimeout(() => {
        if (!directLoadArmed) return;
        trace.action('editor-entrance:direct-load-shell-cleared', {
          renderCompleteSeen,
        });
        runAfterPaint();
      }, DIRECT_LOAD_SHELL_CLEAR_MS);
      timers.push(timer);
    };

    const onRenderComplete = () => {
      renderCompleteSeen = true;
      if (!directLoadArmed) return;
      trace.action('editor-entrance:direct-load-render-complete', {});
      startDirectLoadAfterShellClears();
    };

    const handleDashboardState = (state: FieldDashboardLayerState | null) => {
      const previous = lastDashboardState;
      lastDashboardState = state;

      if (state === 'hiding' && previous !== 'hiding') {
        beginNewRevealCycle();
        return;
      }

      if (state === 'hidden' && previous !== 'hidden') {
        directLoadArmed = false;
        directLoadStarted = false;
        if (cycle === 0) cycle = 1;
        if (!prepared.length) prepare();
        runAfterPaint();
      }
    };

    window.addEventListener(DIRECT_LOAD_RENDER_EVENT, onRenderComplete);

    if (!shell) {
      cycle = 1;
      directLoadArmed = true;
      prepare();
    } else if (lastDashboardState === 'hidden') {
      // A fresh /builder URL and a browser refresh both start with the shell
      // already hidden. ProjectLoader still places BuilderLoadingShell above
      // App until Canvas paints, so we prepare chrome offscreen NOW but wait
      // for that real render boundary before beginning the spring.
      cycle = 1;
      directLoadArmed = true;
      root.dataset.editorEntranceState = 'waiting-canvas';
      prepare();

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
      cycle += 1;
      directLoadArmed = false;
      cancelMotion(true);
      delete root.dataset.editorEntranceState;
    };
  }, []);

  return null;
}
