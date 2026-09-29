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
  kind: 'pan' | 'object';
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
  setPanCursor: (active: boolean) => void;
}

export function useCanvasTouchInteraction({
  containerRef,
  mouseControllerRef,
  dragCoordinatorRef,
  getToolMode,
  setPanCursor,
}: UseCanvasTouchInteractionOptions): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let gesture: GestureState | null = null;

    const cancelOneFinger = (keepCameraCursor = false) => {
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
      controller.handleMouseDown(mouseLike(touch.clientX, touch.clientY, target, 'mousedown'));

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
        dragCoordinatorRef.current?.handleMouseMove(
          mouseLike(touch.clientX, touch.clientY, gesture.target, 'mousemove'),
        );
        gesture.lastX = touch.clientX;
        gesture.lastY = touch.clientY;
        return;
      }

      const totalX = touch.clientX - gesture.startX;
      const totalY = touch.clientY - gesture.startY;
      if (!gesture.panStarted) {
        if (!shouldStartSingleTouchPan(totalX, totalY)) return;
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
      if (gesture) cancelOneFinger(false);
    };
    // Refs are stable; getToolMode reads the live store value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, mouseControllerRef, dragCoordinatorRef, setPanCursor]);
}
