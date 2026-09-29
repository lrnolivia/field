// src/canvas/hooks/useCanvasTransform.ts
//
// Attaches the camera transform listeners (wheel zoom, middle-mouse pan).
// Registers the hidden contentRef with TransformManager. The viewport-header
// overlay is deliberately applied from the transform subscriber AFTER the
// same camera sample is forwarded to the sandbox, so parent chrome cannot
// advance on a separate transform-manager pass ahead of iframe content.
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
  // Coordinates alone cannot claim a gesture: floating panels sit directly
  // over the full-bleed canvas. Only a retargeted ancestor of the canvas may
  // use this fallback; a panel, menu, or other sibling owns its own wheel.
  if (el && !el.contains(container)) return false;
  // Safari may retarget to an ancestor even while a floating panel occupies
  // that point. Hit-test the pointer so the panel still gets the gesture.
  if (el?.contains(container)) {
    const hit = el.ownerDocument.elementFromPoint?.(clientX, clientY);
    if (hit && !container.contains(hit) && !isCanvasChromeWheel(hit, container)) return false;
  }
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

    // Register only the hidden parent-frame anchor. The visible viewport-header
    // overlay must not be an independently flushed TransformManager element:
    // that flush happens before subscribers run, while the sandbox camera is
    // forwarded from the subscriber. Registering both created a guaranteed
    // ordering where the header could move before the viewport below it.
    if (content) {
      transformManager.addElement(content);
    }

    // Subscribe for transform updates:
    // 1. Forward the authoritative camera sample to the sandbox.
    // 2. Apply that SAME sample to the parent viewport-header overlay.
    // 3. Update header geometry and interaction state.
    let interactTimeout: ReturnType<typeof setTimeout> | null = null;
    const unsub = transformManager.subscribe(() => {
      setCanvasInteracting(true);
      // …and specifically that the CAMERA is what's moving, so node-scoped
      // overlays can hide (SelectionOverlay's InteractionOutline).
      cameraMoveOps.set(true);

      const t = transformManager.getTransform();
      if (postMessageBridgeRef.current?.isReady) {
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

      // The header overlay consumes the exact camera sample just forwarded
      // above instead of participating in TransformManager's earlier element
      // flush. This keeps the viewport label on the same camera transaction
      // as the iframe surface and removes the visible "viewport slides behind
      // its header" lead during pan/zoom.
      if (vpOverlay) {
        transformManager.applyToElement(vpOverlay);
        updateViewportHeaderPositions(vpOverlay);
      }

      if (interactTimeout) clearTimeout(interactTimeout);
      interactTimeout = setTimeout(() => {
        // While a drag is in flight, leave canvasInteracting alone — the
        // drag's own start/end transitions own the flag. This debounce used
        // to fire 100 ms after the last auto-pan tick (i.e. when
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
      }, 100);
    });

    // Initialize both surfaces from one camera sample, preserving the same
    // sandbox-first ordering used for live pan/zoom.
    const initialTransform = transformManager.getTransform();
    if (postMessageBridgeRef.current?.isReady) {
      trace.action('canvas-transform:initial-forward', initialTransform);
      postMessageBridgeRef.current.setViewportTransform(
        initialTransform.x,
        initialTransform.y,
        initialTransform.scale,
      );
    }
    if (vpOverlay) {
      transformManager.applyToElement(vpOverlay);
      updateViewportHeaderPositions(vpOverlay);
    }

    return () => {
      trace.action('canvas-transform:teardown', {
        hasContent: !!content,
        hasVpOverlay: !!vpOverlay,
      });
      if (interactTimeout) clearTimeout(interactTimeout);
      if (content) transformManager.removeElement(content);
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

  // ─── DOM mutation observer for debug trace ─────────────────────────────
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    trace.action('canvas-transform:dom-observer-start', {});
    return observeDOM(content);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Wheel + middle-mouse pan: native event listeners ──────────────────
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
