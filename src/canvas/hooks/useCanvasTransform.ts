// src/canvas/hooks/useCanvasTransform.ts
//
// Attaches the camera transform listeners (wheel zoom, middle-mouse pan).
// Registers contentRef + vpOverlayRef with the transformManager so it can
// apply transforms automatically and forward the viewport transform to the
// sandbox iframe on every pan/zoom tick.
//
// Also owns:
//   - transformManager subscribe → viewport header position updates + bridge forwarding
//   - wheel + middle-mouse-pan native event listeners
//   - iframe wheel forwarding (postMessage → synthesized WheelEvent)
//   - startViewportHeaderTracking continuous position polling
//   - observeDOM debug trace observer
//
// Auto-pan attachment lives in Canvas.tsx until Task 9 folds it into
// CanvasDragOrchestrator.

import { useEffect } from 'react';
import {
  transformManager,
  handleWheel,
  attachMiddleMousePan,
} from '../transform';
import {
  updateViewportHeaderPositions,
  setViewportHeadersVisible,
  startViewportHeaderTracking,
} from '../ViewportHeaderManager';
import { useSetAtom } from 'jotai';
import { canvasInteractingAtom } from '@/code/stores/store';
import { cameraMoveOps } from '@/canvas/camera-move-store';
import { trace, observeDOM } from '@/shared/debug-trace';
import type { PostMessageBridge } from '@/canvas-sandbox/bridge-host';

/** Marker for canvas chrome portalled OUTSIDE the canvas container that must
 *  still zoom/pan the canvas under the wheel (see the passthrough below). */
export const CANVAS_WHEEL_MARKER = 'data-canvas-wheel';
/** Marker for portalled/editor UI that must own wheel input rather than routing it to the canvas. */
export const CANVAS_WHEEL_BLOCK_MARKER = 'data-field-no-canvas-input';

/** True when a wheel event's target is marked chrome living outside `container`. */
export function isCanvasChromeWheel(target: EventTarget | null, container: Element): boolean {
  const el = target instanceof Element ? target : null;
  if (!el || container.contains(el)) return false;
  return el.closest(`[${CANVAS_WHEEL_MARKER}]`) !== null;
}

/** True when a wheel target belongs to editor UI that explicitly owns the gesture. */
export function isCanvasWheelBlocked(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null;
  return el?.closest(`[${CANVAS_WHEEL_BLOCK_MARKER}]`) !== null;
}

type WheelRouteRect = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;

/** Route wheel input to the canvas without depending on browser-specific
 * event retargeting around the cross-origin, pointer-events:none iframe.
 *
 * Chrome normally targets an element inside the canvas. Safari can surface
 * the same trackpad wheel sequence on an ancestor/root instead, so coordinates
 * inside the canvas viewport are authoritative too. Portalled canvas chrome
 * remains opt-in via CANVAS_WHEEL_MARKER. */
export function shouldRouteCanvasWheel(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
  container: Element,
  rect: WheelRouteRect = container.getBoundingClientRect(),
): boolean {
  const el = target instanceof Element ? target : null;
  if (isCanvasWheelBlocked(target)) return false;
  if (el && container.contains(el)) return true;
  if (isCanvasChromeWheel(target, container)) return true;
  return clientX >= rect.left
    && clientX <= rect.right
    && clientY >= rect.top
    && clientY <= rect.bottom;
}


export interface UseCanvasTransformOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  vpOverlayRef: React.RefObject<HTMLDivElement | null>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  postMessageBridgeRef: React.RefObject<PostMessageBridge | null>;
  dragCoordinatorRef: React.RefObject<{ isDragging?: boolean } | null>;
  // setPanCursor drives the cursor + hand-tool highlight during middle-mouse pan
  setPanCursor: (v: boolean) => void;
}

export function useCanvasTransform(opts: UseCanvasTransformOptions) {
  const {
    containerRef,
    contentRef,
    vpOverlayRef,
    iframeRef,
    postMessageBridgeRef,
    dragCoordinatorRef,
    setPanCursor,
  } = opts;

  const setCanvasInteracting = useSetAtom(canvasInteractingAtom);

  // ─── TransformManager element registration + subscribe ─────────────────
  useEffect(() => {
    const content = contentRef.current;
    const vpOverlay = vpOverlayRef.current;

    trace.action('canvas-transform:setup', {
      hasContent: !!content,
      hasVpOverlay: !!vpOverlay,
    });

    // Register elements with TransformManager — it applies transforms automatically.
    // contentRef is a hidden parent-frame anchor (kept for SelectionBox/DragCoordinator refs);
    // sandbox transforms are forwarded via postMessage below.
    if (content) {
      transformManager.addElement(content);
    }
    if (vpOverlay) transformManager.addElement(vpOverlay);

    // Subscribe for transform updates:
    // 1. Update viewport header positions
    // 2. Hide visual helpers during interaction (debounced — show again 100ms after last update)
    // 3. Forward transform to sandbox iframe
    let interactTimeout: ReturnType<typeof setTimeout> | null = null;
    const unsub = transformManager.subscribe(() => {
      if (vpOverlay) {
        updateViewportHeaderPositions(vpOverlay);
        setViewportHeadersVisible(vpOverlay, false);
      }
      setCanvasInteracting(true);
      // …and specifically that the CAMERA is what's moving, so node-scoped
      // overlays can hide (SelectionOverlay's InteractionOutline).
      cameraMoveOps.set(true);

      if (postMessageBridgeRef.current?.isReady) {
        const t = transformManager.getTransform();
        trace.action('canvas-transform:bridge-forward', { x: t.x, y: t.y, scale: t.scale });
        // Per-tick live forwarding for BOTH pan and zoom. A surface-freeze
        // experiment (compositing zoom gestures on the iframe element,
        // 2026-07-19) was REMOVED: any freeze window shows partially-
        // revealed content during a zoom-out, which reads as nodes
        // appearing "bit by bit" — user-rejected. Live forwarding keeps the
        // canvas complete at every tick; culled tiles show their grey
        // placeholders and materialise via the staggered idle restore.
        postMessageBridgeRef.current.setViewportTransform(t.x, t.y, t.scale);
      }

      if (interactTimeout) clearTimeout(interactTimeout);
      interactTimeout = setTimeout(() => {
        // While a drag is in flight, leave canvasInteracting alone — the
        // drag's own start/end transitions own the flag. This debounce
        // used to fire 100 ms after the last auto-pan tick (i.e. when
        // the user moved the cursor back off the edge mid-drag).
        // Letting it run flipped `canvasInteracting` to false MID-DRAG,
        // which propagated through the
        // `setDndInteracting(canvasInteractingVal)` effect and told the
        // iframe's canvas-dnd to stop forwarding pointermove events to
        // the parent. The strategy's `onMove` then never ran for cursor
        // positions over the iframe, so the drop-line and
        // parent-highlight stopped updating until drag end. Skipping
        // this branch during a drag keeps the iframe's pointer
        // forwarding alive for the rest of the gesture.
        if (!dragCoordinatorRef.current?.isDragging) {
          setCanvasInteracting(false);
        }
        // The camera has settled either way — an auto-panning drag keeps
        // `canvasInteracting` (above) but the camera itself has stopped.
        cameraMoveOps.set(false);
        if (vpOverlay) setViewportHeadersVisible(vpOverlay, true);
      }, 100);
    });

    // Send initial transform to sandbox
    if (postMessageBridgeRef.current?.isReady) {
      const t = transformManager.getTransform();
      trace.action('canvas-transform:initial-forward', { x: t.x, y: t.y, scale: t.scale });
      postMessageBridgeRef.current.setViewportTransform(t.x, t.y, t.scale);
    }

    return () => {
      trace.action('canvas-transform:teardown', {
        hasContent: !!content,
        hasVpOverlay: !!vpOverlay,
      });
      if (content) transformManager.removeElement(content);
      if (vpOverlay) transformManager.removeElement(vpOverlay);
      unsub();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Continuously track viewport header positions ───────────────────────
  // Covers viewport drag/resize/add — which all change the iframe DOM rect
  // on their own timeline, separate from React renders.
  useEffect(() => {
    const vpOverlay = vpOverlayRef.current;
    if (!vpOverlay) return;
    trace.action('canvas-transform:header-tracking-start', {});
    return startViewportHeaderTracking(vpOverlay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── DOM mutation observer for debug trace ──────────────────────────────
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    trace.action('canvas-transform:dom-observer-start', {});
    return observeDOM(content);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Wheel + middle-mouse pan: native event listeners ───────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    trace.action('canvas-transform:wheel-attach', {});

    // Capture wheel once at window level and route by canvas hit geometry.
    // Safari/WebKit can retarget trackpad wheel events around the cross-origin
    // pointer-events:none iframe so they never bubble through `container`.
    // Coordinate routing makes the canvas boundary deterministic across engines.
    const onWindowWheel = (e: WheelEvent) => {
      const rect = container.getBoundingClientRect();
      if (!shouldRouteCanvasWheel(e.target, e.clientX, e.clientY, container, rect)) return;
      handleWheel(e, rect as DOMRect);
    };
    window.addEventListener('wheel', onWindowWheel, { passive: false, capture: true });

    // Middle-mouse pan via native pointer events + pointer capture.
    // This prevents browser auto-scroll AND gives reliable button-matched up/down.
    const detachMiddlePan = attachMiddleMousePan(container, setPanCursor);

    // Wheel events INSIDE the iframe don't bubble to parent — sandbox forwards
    // them via postMessage. Synthesize a WheelEvent here so handleWheel works
    // unchanged. Coordinates from the message are iframe-local; add the
    // iframe's screen offset so handleWheel's container-relative math is correct.
    const onIframeWheel = (e: MessageEvent) => {
      if (!e.data || e.data.type !== 'wheel') return;
      const iframe = iframeRef.current;
      if (!iframe) return;
      const ir = iframe.getBoundingClientRect();
      const synthetic = new WheelEvent('wheel', {
        deltaX: e.data.deltaX,
        deltaY: e.data.deltaY,
        ctrlKey: e.data.ctrlKey,
        metaKey: e.data.metaKey,
        clientX: e.data.clientX + ir.left,
        clientY: e.data.clientY + ir.top,
      });
      handleWheel(synthetic, container.getBoundingClientRect());
    };
    window.addEventListener('message', onIframeWheel);

    return () => {
      trace.action('canvas-transform:wheel-detach', {});
      window.removeEventListener('wheel', onWindowWheel, { capture: true } as any);
      detachMiddlePan();
      window.removeEventListener('message', onIframeWheel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
