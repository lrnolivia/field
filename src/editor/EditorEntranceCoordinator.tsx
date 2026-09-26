import { useLayoutEffect } from 'react';
import {
  collectEditorEntranceTargets,
  consumeEditorEntranceNotBeforeDelay,
  editorEntranceDelay,
  editorEntranceKeyframes,
  EDITOR_ENTRANCE_DASHBOARD_HANDOFF_MS,
  EDITOR_ENTRANCE_DURATION_MS,
  FIELD_SHELL_SELECTOR,
  readFieldDashboardLayerState,
  type EditorEntranceRole,
  type FieldDashboardLayerState,
} from './editor-entrance';
import { trace } from '@/shared/debug-trace';

type ActiveViewTransitionDocument = Document & {
  activeViewTransition?: {
    finished?: Promise<unknown>;
  } | null;
};

type PreparedTarget = {
  element: HTMLElement;
  role: EditorEntranceRole;
  previous: {
    translate: string;
    opacity: string;
    pointerEvents: string;
    willChange: string;
  };
};

function prepareTarget(element: HTMLElement, role: EditorEntranceRole): PreparedTarget {
  const previous = {
    translate: element.style.translate,
    opacity: element.style.opacity,
    pointerEvents: element.style.pointerEvents,
    willChange: element.style.willChange,
  };
  const first = editorEntranceKeyframes(role)[0];

  element.style.translate = String(first.translate ?? '0 0');
  element.style.opacity = String(first.opacity ?? 1);
  element.style.pointerEvents = 'none';
  element.style.willChange = previous.willChange
    ? `${previous.willChange}, translate, opacity`
    : 'translate, opacity';

  return { element, role, previous };
}

function restoreTarget(target: PreparedTarget): void {
  target.element.style.translate = target.previous.translate;
  target.element.style.opacity = target.previous.opacity;
  target.element.style.pointerEvents = target.previous.pointerEvents;
  target.element.style.willChange = target.previous.willChange;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(finish, ms);
    function finish() {
      signal.removeEventListener('abort', abort);
      resolve();
    }
    function abort() {
      window.clearTimeout(timer);
      finish();
    }
    signal.addEventListener('abort', abort, { once: true });
  });
}

/**
 * The live FieldShell mounts ProjectLoader/App BEHIND Dashboard before it
 * reveals the editor. The first version of this choreography started on App
 * mount, so the entire entrance completed invisibly underneath Dashboard.
 *
 * This waits on FieldShell's deterministic `data-dashboard-state` contract.
 * It is an attribute observation of an explicit state machine — not visual
 * polling or timing inference from CSS.
 */
async function waitForFieldShellReveal(signal: AbortSignal): Promise<void> {
  const shell = document.querySelector<HTMLElement>(FIELD_SHELL_SELECTOR);
  if (!shell || signal.aborted) return;

  let state = readFieldDashboardLayerState(document);
  if (state === 'hidden' || state === null) return;

  if (state !== 'hiding') {
    state = await new Promise<FieldDashboardLayerState | null>((resolve) => {
      let settled = false;
      const finish = (value: FieldDashboardLayerState | null) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      };
      const observer = new MutationObserver(() => {
        const next = readFieldDashboardLayerState(document);
        if (next === 'hiding' || next === 'hidden' || next === null) finish(next);
      });
      const onAbort = () => finish(null);

      observer.observe(shell, {
        attributes: true,
        attributeFilter: ['data-dashboard-state'],
      });
      signal.addEventListener('abort', onAbort, { once: true });

      // Close the tiny race between the read above and observer registration.
      const immediate = readFieldDashboardLayerState(document);
      if (immediate === 'hiding' || immediate === 'hidden' || immediate === null) {
        finish(immediate);
      }
    });
  }

  if (signal.aborted) return;
  if (state === 'hiding') {
    await wait(EDITOR_ENTRANCE_DASHBOARD_HANDOFF_MS, signal);
  }
}

async function waitForRevealBoundary(signal: AbortSignal): Promise<void> {
  await waitForFieldShellReveal(signal);
  if (signal.aborted) return;

  const transition = (document as ActiveViewTransitionDocument).activeViewTransition;
  if (transition?.finished) {
    try {
      await transition.finished;
    } catch {
      // A cancelled navigation transition should not suppress editor chrome.
    }
  }

  const handoffDelay = consumeEditorEntranceNotBeforeDelay(
    typeof sessionStorage === 'undefined' ? null : sessionStorage,
  );

  if (handoffDelay > 0) await wait(handoffDelay, signal);
  if (signal.aborted) return;

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export default function EditorEntranceCoordinator() {
  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const root = document.documentElement;

    if (reducedMotion) {
      root.dataset.editorEntranceState = 'settled';
      trace.action('editor-entrance:reduced-motion', {});
      return;
    }

    const discovered = collectEditorEntranceTargets(document);
    if (discovered.length === 0) {
      root.dataset.editorEntranceState = 'settled';
      return;
    }

    // IMPORTANT: prepare immediately while Dashboard still covers the builder.
    // That leaves only Canvas/content underneath the outgoing Dashboard; chrome
    // cannot flash in its final position before the reveal handoff.
    const prepared = discovered.map(({ element, role }) => prepareTarget(element, role));
    const animations: Animation[] = [];
    const timers: number[] = [];
    const abortController = new AbortController();
    let cancelled = false;
    let settledCount = 0;

    root.dataset.editorEntranceState = 'prepared';
    trace.action('editor-entrance:prepared', {
      targets: prepared.map(({ role }) => role),
      dashboardState: readFieldDashboardLayerState(document),
    });

    const settle = (target: PreparedTarget) => {
      restoreTarget(target);
      settledCount += 1;
      if (!cancelled && settledCount >= prepared.length) {
        root.dataset.editorEntranceState = 'settled';
        trace.action('editor-entrance:settled', {});
      }
    };

    void waitForRevealBoundary(abortController.signal).then(() => {
      if (cancelled || abortController.signal.aborted) return;
      root.dataset.editorEntranceState = 'entering';
      trace.action('editor-entrance:entering', {
        dashboardState: readFieldDashboardLayerState(document),
      });

      for (const target of prepared) {
        const timer = window.setTimeout(() => {
          if (cancelled) return;

          if (typeof target.element.animate !== 'function') {
            settle(target);
            return;
          }

          const animation = target.element.animate(
            editorEntranceKeyframes(target.role),
            {
              duration: EDITOR_ENTRANCE_DURATION_MS,
              easing: 'linear',
              fill: 'both',
            },
          );
          animations.push(animation);

          animation.onfinish = () => {
            animation.cancel();
            settle(target);
          };
          animation.oncancel = () => {
            if (!cancelled) settle(target);
          };
        }, editorEntranceDelay(target.role));
        timers.push(timer);
      }
    });

    return () => {
      cancelled = true;
      abortController.abort();
      for (const timer of timers) window.clearTimeout(timer);
      for (const animation of animations) {
        animation.onfinish = null;
        animation.oncancel = null;
        animation.cancel();
      }
      for (const target of prepared) restoreTarget(target);
      delete root.dataset.editorEntranceState;
    };
  }, []);

  return null;
}
