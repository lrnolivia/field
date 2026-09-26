import { useLayoutEffect } from 'react';
import {
  collectEditorEntranceTargets,
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
    let cycle = 0;
    let running = false;
    let lastDashboardState: FieldDashboardLayerState | null = readFieldDashboardLayerState(document);

    const cancelMotion = (restore = true) => {
      for (const timer of timers) window.clearTimeout(timer);
      timers = [];
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
      });

      const settleOne = (target: PreparedTarget) => {
        restoreTarget(target);
        settled += 1;
        if (settled >= prepared.length && currentCycle === cycle) {
          prepared = [];
          animations = [];
          timers = [];
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

    const beginNewRevealCycle = () => {
      cycle += 1;
      cancelMotion(true);
      prepare();
    };

    const handleDashboardState = (state: FieldDashboardLayerState | null) => {
      const previous = lastDashboardState;
      lastDashboardState = state;

      // Direct /builder load: there is no Dashboard exit to wait for.
      if (state === 'hidden' && previous === 'hidden' && cycle === 0) {
        cycle = 1;
        prepare();
        requestAnimationFrame(run);
        return;
      }

      // Dashboard has just begun leaving. Prepare all physical chrome offscreen
      // while the Dashboard still fully covers the builder.
      if (state === 'hiding' && previous !== 'hiding') {
        beginNewRevealCycle();
        return;
      }

      // IMPORTANT: start only after FieldShell's authoritative state reaches
      // hidden. Dashboard may tune its animation duration freely; there is no
      // hardcoded 150/360/420/480ms dependency here.
      if (state === 'hidden' && previous !== 'hidden') {
        if (cycle === 0) cycle = 1;
        if (!prepared.length) prepare();
        requestAnimationFrame(run);
      }
    };

    if (!shell) {
      cycle = 1;
      prepare();
      requestAnimationFrame(run);
      return () => cancelMotion(true);
    }

    // Initial direct builder load starts hidden. Dashboard-first navigation
    // starts visible and will be prepared on the later `hiding` transition.
    if (lastDashboardState === 'hidden') {
      cycle = 1;
      prepare();
      requestAnimationFrame(run);
    } else {
      root.dataset.editorEntranceState = 'waiting';
    }

    const observer = new MutationObserver(() => {
      handleDashboardState(readFieldDashboardLayerState(document));
    });
    observer.observe(shell, {
      attributes: true,
      attributeFilter: ['data-dashboard-state'],
    });

    return () => {
      observer.disconnect();
      cycle += 1;
      cancelMotion(true);
      delete root.dataset.editorEntranceState;
    };
  }, []);

  return null;
}
