import { useLayoutEffect } from 'react';
import {
  collectEditorEntranceTargets,
  consumeEditorEntranceNotBeforeDelay,
  editorEntranceDelay,
  editorEntranceKeyframes,
  EDITOR_ENTRANCE_DURATION_MS,
  type EditorEntranceRole,
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

async function waitForRevealBoundary(): Promise<void> {
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

  if (handoffDelay > 0) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, handoffDelay));
  }

  // Let the hydrated Canvas paint once before chrome moves over it. This makes
  // the choreography read as "workspace assembling around the real website",
  // never as panels arriving while the Canvas itself is still appearing.
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

    const prepared = discovered.map(({ element, role }) => prepareTarget(element, role));
    const animations: Animation[] = [];
    const timers: number[] = [];
    let cancelled = false;
    let settledCount = 0;

    root.dataset.editorEntranceState = 'prepared';
    trace.action('editor-entrance:prepared', {
      targets: prepared.map(({ role }) => role),
    });

    const settle = (target: PreparedTarget) => {
      restoreTarget(target);
      settledCount += 1;
      if (!cancelled && settledCount >= prepared.length) {
        root.dataset.editorEntranceState = 'settled';
        trace.action('editor-entrance:settled', {});
      }
    };

    void waitForRevealBoundary().then(() => {
      if (cancelled) return;
      root.dataset.editorEntranceState = 'entering';

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
