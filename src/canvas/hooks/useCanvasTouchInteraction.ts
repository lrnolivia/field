// src/canvas/hooks/useCanvasTouchInteraction.ts
//
// First-class one-finger touch behavior for Focus/mobile:
//   - tap/hit -> existing CanvasMouseController selection semantics
//   - drag hit object -> existing DragCoordinator strategies
//   - drag empty canvas -> camera pan
//   - second finger -> cancel/revert one-finger interaction and yield to the
//     two-finger camera listener owned by InputHandler/useCanvasTransform
//
// Interactive selection/resize handles are intentionally NOT claimed here.
// They are child DOM targets and keep their existing pointer-event behavior.

import { useEffect, type RefObject } from 'react';
import { transformManager } from '../transform';
import { getNodeHitsAtPoint } from '../node-ops';
import type { CanvasMouseController } from '../mouse/CanvasMouseController';
import type { DragCoordinator } from '../drag/DragCoordinator';
import { trace } from '@/shared/debug-trace';

export const SINGLE_TOUCH_PAN_THRESHOLD_PX = 4;
export const TOUCH_MARQUEE_HOLD_MS = 420;
export const TOUCH_CONTEXT_MENU_HOLD_MS = 420;

const TOUCH_MARQUEE_START_EVENT = 'field:touch-marquee-start';
const TOUCH_MARQUEE_MOVE_EVENT = 'field:touch-marquee-move';
const TOUCH_MARQUEE_END_EVENT = 'field:touch-marquee-end';
const TOUCH_MARQUEE_CANCEL_EVENT = 'field:touch-marquee-cancel';

const MOBILE_KEYBOARD_PRIMER_LIFETIME_MS = 700;

/**
 * iOS only raises the software keyboard when an editable element receives
 * focus during the trusted touch event. The real TipTap editor lives in the
 * sandbox iframe and is created from a postMessage task, so its autofocus can
 * arrive after transient user activation has expired. Prime the keyboard with
 * a tiny parent-frame textarea in the SAME touchstart that opened text edit;
 * sandbox autofocus then takes over the already-open keyboard.
 */
export function primeMobileSoftwareKeyboard(doc: Document = document): () => void {
  const existing = doc.querySelector<HTMLTextAreaElement>('[data-field-mobile-keyboard-primer]');
  existing?.remove();

  const primer = doc.createElement('textarea');
  primer.setAttribute('data-field-mobile-keyboard-primer', '');
  primer.setAttribute('aria-label', 'Text editing');
  primer.setAttribute('autocomplete', 'off');
  primer.setAttribute('autocapitalize', 'off');
  primer.setAttribute('spellcheck', 'false');
  primer.tabIndex = -1;
  primer.inputMode = 'text';
  Object.assign(primer.style, {
    position: 'fixed',
    left: '0',
    bottom: '0',
    width: '1px',
    height: '1px',
    padding: '0',
    border: '0',
    opacity: '0.01',
    fontSize: '16px',
    pointerEvents: 'none',
    zIndex: '-1',
  });

  doc.body.appendChild(primer);
  try {
    primer.focus({ preventScroll: true });
  } catch {
    primer.focus();
  }

  const timer = window.setTimeout(() => {
    if (doc.activeElement === primer) primer.blur();
    primer.remove();
  }, MOBILE_KEYBOARD_PRIMER_LIFETIME_MS);

  return () => {
    window.clearTimeout(timer);
    if (doc.activeElement === primer) primer.blur();
    primer.remove();
  };
}

export function shouldStartSingleTouchPan(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= SINGLE_TOUCH_PAN_THRESHOLD_PX;
}

export function singleTouchPanDelta(
  previous: { x: number; y: number },
  current: { x: number; y: number },
): { dx: number; dy: number } {
  return { dx: current.x - previous.x, dy: current.y - previous.y };
}

function isCanvasTouchSurface(target: EventTarget | null, container: HTMLElement): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target === container || target.hasAttribute('data-canvas-input-surface');
}

type TouchMarqueeEventName =
  | typeof TOUCH_MARQUEE_START_EVENT
  | typeof TOUCH_MARQUEE_MOVE_EVENT
  | typeof TOUCH_MARQUEE_END_EVENT
  | typeof TOUCH_MARQUEE_CANCEL_EVENT;

function dispatchTouchMarquee(
  doc: Document,
  type: TouchMarqueeEventName,
  clientX: number,
  clientY: number,
): void {
  const EventCtor = doc.defaultView?.CustomEvent ?? CustomEvent;
  doc.dispatchEvent(new EventCtor(type, { detail: { clientX, clientY } }));
}

function dispatchTouchContextMenu(
  target: HTMLElement,
  clientX: number,
  clientY: number,
): void {
  const doc = target.ownerDocument;
  const MouseEventCtor = doc.defaultView?.MouseEvent ?? MouseEvent;
  target.dispatchEvent(new MouseEventCtor('contextmenu', {
    bubbles: true,
    cancelable: true,
    view: doc.defaultView,
    clientX,
    clientY,
    button: 2,
    buttons: 0,
  }));
}

function mouseLike(
  clientX: number,
  clientY: number,
  target: HTMLElement,
  type: 'mousedown' | 'mousemove' | 'mouseup',
): MouseEvent {
  return {
    type,
    button: 0,
    buttons: type === 'mouseup' ? 0 : 1,
    clientX,
    clientY,
    screenX: clientX,
    screenY: clientY,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target,
    currentTarget: target,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  } as unknown as MouseEvent;
}

interface GestureState {
  kind: 'pan' | 'object' | 'marquee' | 'context-menu';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  panStarted: boolean;
  target: HTMLElement;
}

export interface UseCanvasTouchInteractionOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  mouseControllerRef: RefObject<CanvasMouseController | null>;
  dragCoordinatorRef: RefObject<DragCoordinator | null>;
  getToolMode: () => string;
  isTextEditing: () => boolean;
  setPanCursor: (active: boolean) => void;
}

export function useCanvasTouchInteraction({
  containerRef,
  mouseControllerRef,
  dragCoordinatorRef,
  getToolMode,
  isTextEditing,
  setPanCursor,
}: UseCanvasTouchInteractionOptions): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let gesture: GestureState | null = null;
    let releaseKeyboardPrimer: (() => void) | null = null;
    let longPressTimer: number | null = null;

    const clearLongPressTimer = () => {
      if (longPressTimer === null) return;
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    };

    const cancelOneFinger = (keepCameraCursor = false) => {
      clearLongPressTimer();
      if (gesture?.kind === 'marquee') {
        dispatchTouchMarquee(
          container.ownerDocument,
          TOUCH_MARQUEE_CANCEL_EVENT,
          gesture.lastX,
          gesture.lastY,
        );
      }
      const controller = mouseControllerRef.current;
      controller?.cancelTouchInteraction();

      const coordinator = dragCoordinatorRef.current;
      if (coordinator?.isDragging || coordinator?.isPending) {
        coordinator.cancel();
      }

      gesture = null;
      if (!keepCameraCursor) setPanCursor(false);
    };

    const onTouchStart = (event: TouchEvent) => {
      // The second finger is the hard ownership boundary. InputHandler's
      // two-finger listener owns the camera from here; revert any optimistic
      // one-finger object movement before that camera starts moving.
      if (event.touches.length >= 2) {
        if (gesture) cancelOneFinger(true);
        return;
      }

      if (event.touches.length !== 1 || getToolMode() !== 'select') return;
      if (!isCanvasTouchSurface(event.target, container)) return;

      const controller = mouseControllerRef.current;
      const touch = event.touches.item(0);
      if (!controller || !touch) return;

      event.preventDefault();

      const target = event.target instanceof HTMLElement ? event.target : container;
      const hits = getNodeHitsAtPoint(touch.clientX, touch.clientY);
      const wasTextEditing = isTextEditing();
      controller.handleMouseDown(mouseLike(touch.clientX, touch.clientY, target, 'mousedown'));

      // The existing double-click detector starts text edit synchronously on
      // the second tap. Prime iOS's keyboard before this trusted touchstart
      // returns; the sandbox-hosted TipTap editor autofocuses moments later.
      if (!wasTextEditing && isTextEditing()) {
        releaseKeyboardPrimer?.();
        releaseKeyboardPrimer = primeMobileSoftwareKeyboard(container.ownerDocument);
        trace.action('input:mobile-keyboard-prime', {});
      }

      const coordinator = dragCoordinatorRef.current;
      const objectIntent = !!coordinator?.isPending || hits.length > 0;
      gesture = {
        kind: objectIntent ? 'object' : 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        panStarted: false,
        target,
      };

      if (gesture.kind === 'object') {
        longPressTimer = window.setTimeout(() => {
          longPressTimer = null;
          if (!gesture || gesture.kind !== 'object') return;

          const coordinatorNow = dragCoordinatorRef.current;
          if (coordinatorNow?.isDragging) return;

          // A stationary object hold opens the exact same menu as right-click.
          // Cancel deferred click/drag bookkeeping first so lifting the finger
          // cannot perform a second action behind the open menu.
          mouseControllerRef.current?.cancelTouchInteraction();
          if (coordinatorNow?.isPending) coordinatorNow.cancel();
          gesture.kind = 'context-menu';
          dispatchTouchContextMenu(
            gesture.target,
            gesture.startX,
            gesture.startY,
          );
          trace.action('input:touch-context-menu', {
            x: gesture.startX,
            y: gesture.startY,
            holdMs: TOUCH_CONTEXT_MENU_HOLD_MS,
          });
        }, TOUCH_CONTEXT_MENU_HOLD_MS);
      } else if (gesture.kind === 'pan') {
        longPressTimer = window.setTimeout(() => {
          longPressTimer = null;
          if (!gesture || gesture.kind !== 'pan' || gesture.panStarted) return;

          // Empty-space long press deliberately switches from the primary
          // one-finger camera gesture into the canonical marquee engine.
          mouseControllerRef.current?.cancelEmptyCanvasClick();
          gesture.kind = 'marquee';
          dispatchTouchMarquee(
            container.ownerDocument,
            TOUCH_MARQUEE_START_EVENT,
            gesture.startX,
            gesture.startY,
          );
          trace.action('input:touch-marquee-hold', {
            x: gesture.startX,
            y: gesture.startY,
            holdMs: TOUCH_MARQUEE_HOLD_MS,
          });
        }, TOUCH_MARQUEE_HOLD_MS);
      }

      trace.action('input:single-touch-start', {
        kind: gesture.kind,
        hitCount: hits.length,
        dragPending: !!coordinator?.isPending,
      });
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!gesture) return;

      if (event.touches.length >= 2) {
        cancelOneFinger(true);
        return;
      }

      const touch = event.touches.item(0);
      if (!touch) return;

      event.preventDefault();

      if (gesture.kind === 'object') {
        const totalX = touch.clientX - gesture.startX;
        const totalY = touch.clientY - gesture.startY;
        if (shouldStartSingleTouchPan(totalX, totalY)) clearLongPressTimer();
        dragCoordinatorRef.current?.handleMouseMove(
          mouseLike(touch.clientX, touch.clientY, gesture.target, 'mousemove'),
        );
        gesture.lastX = touch.clientX;
        gesture.lastY = touch.clientY;
        return;
      }

      if (gesture.kind === 'context-menu') {
        return;
      }

      if (gesture.kind === 'marquee') {
        gesture.lastX = touch.clientX;
        gesture.lastY = touch.clientY;
        dispatchTouchMarquee(
          container.ownerDocument,
          TOUCH_MARQUEE_MOVE_EVENT,
          touch.clientX,
          touch.clientY,
        );
        return;
      }

      const totalX = touch.clientX - gesture.startX;
      const totalY = touch.clientY - gesture.startY;
      if (!gesture.panStarted) {
        if (!shouldStartSingleTouchPan(totalX, totalY)) return;
        clearLongPressTimer();
        gesture.panStarted = true;
        mouseControllerRef.current?.cancelEmptyCanvasClick();
        setPanCursor(true);
        trace.action('input:single-touch-pan-start', { x: gesture.startX, y: gesture.startY });
      }

      const delta = singleTouchPanDelta(
        { x: gesture.lastX, y: gesture.lastY },
        { x: touch.clientX, y: touch.clientY },
      );
      gesture.lastX = touch.clientX;
      gesture.lastY = touch.clientY;
      transformManager.pan(delta.dx, delta.dy);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length > 0) return;

      event.preventDefault();
      clearLongPressTimer();
      const finished = gesture;
      gesture = null;

      const changed = event.changedTouches.item(0);
      const x = changed?.clientX ?? finished.lastX;
      const y = changed?.clientY ?? finished.lastY;
      const up = mouseLike(x, y, finished.target, 'mouseup');
      const controller = mouseControllerRef.current;
      const coordinator = dragCoordinatorRef.current;

      if (finished.kind === 'object') {
        // MouseController must observe pending/active drag state BEFORE the
        // coordinator resets so deferred click-vs-drag selection semantics
        // remain correct. Its normal mouse path skips coordinator mouseup while
        // pending window listeners exist; touch then commits explicitly.
        controller?.handleMouseUp(up);
        coordinator?.handleMouseUp();
      } else if (finished.kind === 'context-menu') {
        // The long-press path already cancelled pending mouse/drag state before
        // opening the canonical menu. Finger-up must not click or drag again.
      } else if (finished.kind === 'marquee') {
        controller?.handleMouseUp(up);
        dispatchTouchMarquee(
          container.ownerDocument,
          TOUCH_MARQUEE_END_EVENT,
          x,
          y,
        );
      } else {
        controller?.handleMouseUp(up);
        if (finished.panStarted) setPanCursor(false);
      }

      trace.action('input:single-touch-end', {
        kind: finished.kind,
        panned: finished.panStarted,
      });
    };

    const onTouchCancel = (event: TouchEvent) => {
      if (!gesture) return;
      event.preventDefault();
      cancelOneFinger(false);
    };

    const opts: AddEventListenerOptions = { passive: false, capture: true };
    container.addEventListener('touchstart', onTouchStart, opts);
    container.addEventListener('touchmove', onTouchMove, opts);
    container.addEventListener('touchend', onTouchEnd, opts);
    container.addEventListener('touchcancel', onTouchCancel, opts);

    return () => {
      container.removeEventListener('touchstart', onTouchStart, opts);
      container.removeEventListener('touchmove', onTouchMove, opts);
      container.removeEventListener('touchend', onTouchEnd, opts);
      container.removeEventListener('touchcancel', onTouchCancel, opts);
      clearLongPressTimer();
      if (gesture) cancelOneFinger(false);
      releaseKeyboardPrimer?.();
      releaseKeyboardPrimer = null;
    };
    // Refs are stable; getToolMode/isTextEditing read live store values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, mouseControllerRef, dragCoordinatorRef, setPanCursor]);
}
