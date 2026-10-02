import { QUICK_TOOLS_EVENT, movedPastTapSlop } from '@/editor/portrait/interaction';
// transform/InputHandler.ts — Canvas input event handling.
// Routes wheel, pointer, and touch events to TransformManager.
// Key behavior: regular scroll = pan, ctrl/cmd+scroll = zoom.
//
// Does NOT wire keyboard shortcuts — that's for a future KeyboardManager.
// This only handles events that need to be attached to the canvas DOM element.

import { transformManager } from './TransformManager';
import { moveCanvasTo } from './CameraAnimator';
import {
  ZOOM_WHEEL_SENSITIVITY, ZOOM_PINCH_SENSITIVITY, PINCH_MAX_DELTA, ZOOM_MAX_DELTA,
  PAN_TRACKPAD_MAX_GAIN, PAN_TRACKPAD_GAIN_CUTOFF, PAN_LINE_STEP_PX,
} from './constants';
import { trace } from '@/shared/debug-trace';

/**
 * Is this a TRACKPAD PINCH rather than a deliberate modifier + scroll?
 *
 * The browser gives no flag for it — a pinch is SYNTHESISED as a ctrl-wheel —
 * so this reads two signals:
 *
 * 1. `metaKey` means the user is physically holding Cmd, which no synthesised
 *    pinch ever sets. That is a deliberate zoom and keeps the slower wheel
 *    speed. Without this check, Cmd + two-finger scroll on a trackpad emits the
 *    same small pixel deltas as a pinch and got the pinch's much faster rate —
 *    "that one is going way too fast" (user report 2026-08-09).
 * 2. Otherwise, magnitude: a pinch streams small pixel deltas, the smallest
 *    mouse notch is ~100. `deltaMode` matters too — Firefox reports a mouse
 *    wheel in LINES (deltaMode 1, deltaY ≈ 3), which would look tiny and be
 *    misread as a pinch.
 *
 * Residual ambiguity: Ctrl + two-finger scroll on a trackpad is indistinguish-
 * able from a pinch by event shape alone, and reads as a pinch here. On macOS
 * the OS takes that gesture for screen zoom so it rarely reaches the page, and
 * on Windows it is the same intent at a slightly different speed. Separating
 * them would need physical key tracking, which is unreliable across the canvas
 * iframe boundary — not worth the fragility.
 *
 * Getting it wrong is not dangerous, only mis-tuned: one frame zooms at the
 * other rate, then self-corrects.
 */
export function isTrackpadPinch(
  e: Pick<WheelEvent, 'deltaMode' | 'deltaY'> & { metaKey?: boolean },
): boolean {
  if (e.metaKey) return false;
  return e.deltaMode === 0 && Math.abs(e.deltaY) < PINCH_MAX_DELTA;
}

/** Multiplicative zoom factor for one wheel event. Exponential so the gesture
 *  is symmetric: pinching in and back out returns to the exact starting scale,
 *  which the previous linear form did not. */
export function wheelZoomFactor(
  e: Pick<WheelEvent, 'deltaMode' | 'deltaY'> & { metaKey?: boolean },
): number {
  const k = isTrackpadPinch(e) ? ZOOM_PINCH_SENSITIVITY : ZOOM_WHEEL_SENSITIVITY;
  const delta = Math.max(-ZOOM_MAX_DELTA, Math.min(ZOOM_MAX_DELTA, e.deltaY));
  return Math.exp(-delta * k);
}

export interface WheelPanDelta {
  dx: number;
  dy: number;
  gain: number;
  deltaMode: number;
}

/** Normalize a regular wheel/two-finger pan into screen-space camera deltas.
 *
 * Pixel-mode events are already screen-space, but tiny high-resolution
 * trackpad deltas feel sluggish at raw 1:1. Apply a shared-axis gain curve
 * that is strongest near zero and reaches exactly 1× at the cutoff. Large
 * mouse-style notches and strong momentum remain untouched.
 *
 * Line/page modes are not pixels, so normalize them before reaching the
 * camera. One shared gain for X/Y preserves diagonal gesture direction. */
export function wheelPanDelta(
  e: Pick<WheelEvent, 'deltaMode' | 'deltaX' | 'deltaY'>,
  viewport: Pick<DOMRect, 'width' | 'height'>,
): WheelPanDelta {
  let x = e.deltaX;
  let y = e.deltaY;

  if (e.deltaMode === 1) {
    x *= PAN_LINE_STEP_PX;
    y *= PAN_LINE_STEP_PX;
  } else if (e.deltaMode === 2) {
    x *= viewport.width;
    y *= viewport.height;
  }

  const magnitude = Math.max(Math.abs(x), Math.abs(y));
  const gain = e.deltaMode === 0 && magnitude < PAN_TRACKPAD_GAIN_CUTOFF
    ? 1 + (PAN_TRACKPAD_MAX_GAIN - 1) * (1 - magnitude / PAN_TRACKPAD_GAIN_CUTOFF)
    : 1;

  return { dx: -x * gain, dy: -y * gain, gain, deltaMode: e.deltaMode };
}

// ─── Wheel Handler ──────────────────────────────────────────────────────────

/**
 * Handle wheel events on the canvas container.
 * - Regular scroll → pan
 * - Ctrl/Cmd + scroll → zoom at cursor
 * - Pinch on trackpad → zoom (browsers send ctrlKey=true for pinch)
 */
export function handleWheel(e: WheelEvent, containerRect: DOMRect): void {
  e.preventDefault();

  const anchorX = e.clientX - containerRect.left;
  const anchorY = e.clientY - containerRect.top;

  if (e.ctrlKey || e.metaKey) {
    // Zoom — ctrl+scroll or trackpad pinch (browser sets ctrlKey for both).
    // The factor is multiplicative, so the change stays proportional to the
    // current zoom: at 10% a step moves the scale far less in absolute terms
    // than at 400%, which is what makes zooming feel linear to the hand.
    // Sensitivity is per input device — see constants.ts.
    const factor = wheelZoomFactor(e);
    transformManager.zoomByFactor(anchorX, anchorY, factor);
    trace.action('input:zoom', {
      factor, pinch: isTrackpadPinch(e), deltaY: e.deltaY, anchorX, anchorY,
    });
  } else {
    // Pan — regular scroll / trackpad two-finger swipe. Normalize non-pixel
    // wheel modes and give small high-resolution trackpad deltas a restrained
    // gain so the canvas follows the hand instead of crawling behind it.
    const pan = wheelPanDelta(e, containerRect);
    transformManager.pan(pan.dx, pan.dy);
    trace.action('input:pan', {
      dx: pan.dx, dy: pan.dy, gain: pan.gain, deltaMode: pan.deltaMode,
      rawDx: e.deltaX, rawDy: e.deltaY,
    });
  }
}

// ─── Pointer Pan (middle mouse + hand tool) ─────────────────────────────────
// Middle mouse: handled entirely via native pointer events + pointer capture.
// Hand tool: handled via React mouse events (left-click when hand mode active).

let panState: { startX: number; startY: number; source: 'middle' | 'hand' } | null = null;

/**
 * Attach native pointer event listeners to a container for middle-mouse panning.
 * Uses pointer capture so the browser never activates auto-scroll.
 * Call once from a useEffect. Returns cleanup function.
 */
export function attachMiddleMousePan(container: HTMLElement, onPanStateChange: (panning: boolean) => void): () => void {
  let middleGesture: { pointerId: number; x: number; y: number; moved: boolean } | null = null;
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    container.setPointerCapture(e.pointerId);
    middleGesture = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    panState = { startX: e.clientX, startY: e.clientY, source: 'middle' };
    onPanStateChange(true);
    trace.action('input:middle-mouse-down', { pointerId: e.pointerId });
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!panState || panState.source !== 'middle') return;
    if (middleGesture && e.pointerId !== middleGesture.pointerId) return;
    if (middleGesture && movedPastTapSlop(e.clientX - middleGesture.x, e.clientY - middleGesture.y)) middleGesture.moved = true;
    const dx = e.clientX - panState.startX;
    const dy = e.clientY - panState.startY;
    panState.startX = e.clientX;
    panState.startY = e.clientY;
    transformManager.pan(dx, dy);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!panState || panState.source !== 'middle') return;
    if (e.button !== 1 || (middleGesture && e.pointerId !== middleGesture.pointerId)) return;
    const tap = middleGesture && !middleGesture.moved && !movedPastTapSlop(e.clientX - middleGesture.x, e.clientY - middleGesture.y);
    middleGesture = null;
    try { container.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    panState = null;
    onPanStateChange(false);
    trace.action('input:pan-up', { source: 'middle' });
    if (tap) window.dispatchEvent(new CustomEvent(QUICK_TOOLS_EVENT, { detail: { x: e.clientX, y: e.clientY } }));
  };

  const cancelMiddle = () => {
    middleGesture = null;
    if (panState?.source === 'middle') { panState = null; onPanStateChange(false); }
  };
  container.addEventListener('pointercancel', cancelMiddle, true);
  container.addEventListener('lostpointercapture', cancelMiddle, true);
  window.addEventListener('blur', cancelMiddle);
  // Capture phase so we beat the browser's auto-scroll
  container.addEventListener('pointerdown', onPointerDown, true);
  container.addEventListener('pointermove', onPointerMove, true);
  container.addEventListener('pointerup', onPointerUp, true);
  // Prevent auxclick (middle-click context menu in some browsers)
  const preventAux = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };
  container.addEventListener('auxclick', preventAux, true);

  return () => {
    container.removeEventListener('pointerdown', onPointerDown, true);
    container.removeEventListener('pointermove', onPointerMove, true);
    container.removeEventListener('pointerup', onPointerUp, true);
    container.removeEventListener('auxclick', preventAux, true);
    container.removeEventListener('pointercancel', cancelMiddle, true);
    container.removeEventListener('lostpointercapture', cancelMiddle, true);
    window.removeEventListener('blur', cancelMiddle);
    cancelMiddle();
  };
}

/**
 * Start panning via hand tool (left-click, button 0, when hand tool is active).
 * Called from React mouse handlers.
 */
export function handleHandToolDown(e: MouseEvent): boolean {
  if (e.button !== 0) return false;
  e.preventDefault();
  panState = { startX: e.clientX, startY: e.clientY, source: 'hand' };
  trace.action('input:hand-tool-down');
  return true;
}

/**
 * Continue hand-tool panning. Returns true if handled.
 */
export function handleHandToolMove(e: MouseEvent): boolean {
  if (!panState || panState.source !== 'hand') return false;
  const dx = e.clientX - panState.startX;
  const dy = e.clientY - panState.startY;
  panState.startX = e.clientX;
  panState.startY = e.clientY;
  transformManager.pan(dx, dy);
  return true;
}

/**
 * End hand-tool panning. Returns true if handled.
 */
export function handleHandToolUp(): boolean {
  if (!panState || panState.source !== 'hand') return false;
  panState = null;
  trace.action('input:pan-up', { source: 'hand' });
  return true;
}

export function isPanning(): boolean {
  return panState !== null;
}

// ─── Space + Drag Pan ───────────────────────────────────────────────────────

let spaceBarDown = false;
let spacePanState: { startX: number; startY: number } | null = null;

export function setSpaceBarDown(down: boolean): void {
  spaceBarDown = down;
  if (!down && spacePanState) {
    spacePanState = null;
    trace.action('input:space-pan-end');
  }
}

export function isSpaceBarDown(): boolean {
  return spaceBarDown;
}

export function handleSpacePanDown(e: MouseEvent): boolean {
  if (!spaceBarDown) return false;
  e.preventDefault();
  spacePanState = { startX: e.clientX, startY: e.clientY };
  trace.action('input:space-pan-start');
  return true;
}

export function handleSpacePanMove(e: MouseEvent): boolean {
  if (!spacePanState) return false;
  const dx = e.clientX - spacePanState.startX;
  const dy = e.clientY - spacePanState.startY;
  spacePanState.startX = e.clientX;
  spacePanState.startY = e.clientY;
  transformManager.pan(dx, dy);
  return true;
}

export function handleSpacePanUp(): boolean {
  if (!spacePanState) return false;
  spacePanState = null;
  trace.action('input:space-pan-end');
  return true;
}

export function isSpacePanning(): boolean {
  return spacePanState !== null;
}

// ─── Touch Events (trackpad / mobile) ───────────────────────────────────────

export interface TouchPoint {
  clientX: number;
  clientY: number;
}

export interface TouchCameraSnapshot {
  distance: number;
  midpoint: { x: number; y: number };
}

export interface TouchCameraFrame extends TouchCameraSnapshot {
  panX: number;
  panY: number;
  zoomFactor: number;
}

/** The mobile camera only claims a gesture once two fingers are present.
 * A single finger remains available to selection / object manipulation. */
export function shouldOwnTouchCamera(touchCount: number): boolean {
  return touchCount >= 2;
}

/** Pure geometry for a two-finger camera frame. Exported so the touch contract
 * is testable without synthesising browser-specific TouchEvent objects. */
export function touchCameraFrame(
  touches: readonly TouchPoint[],
  previous: TouchCameraSnapshot | null = null,
): TouchCameraFrame | null {
  if (!shouldOwnTouchCamera(touches.length)) return null;

  const a = touches[0];
  const b = touches[1];
  const dx = b.clientX - a.clientX;
  const dy = b.clientY - a.clientY;
  const distance = Math.hypot(dx, dy);
  const midpoint = {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  };

  if (!previous || previous.distance <= 0 || distance <= 0) {
    return { distance, midpoint, panX: 0, panY: 0, zoomFactor: 1 };
  }

  return {
    distance,
    midpoint,
    panX: midpoint.x - previous.midpoint.x,
    panY: midpoint.y - previous.midpoint.y,
    zoomFactor: distance / previous.distance,
  };
}

/** Track touch pointers on the stable Canvas container. Header selection may
 * rebuild the original target; pointer capture keeps the gesture connected. */
export function attachTouchCamera(
  container: HTMLElement,
  onCameraStateChange: (active: boolean) => void,
): () => void {
  const pointers = new Map<number, TouchPoint>();
  let state: TouchCameraSnapshot | null = null;

  const reset = () => {
    if (!state) return;
    state = null;
    onCameraStateChange(false);
  };
  const rebase = () => {
    const frame = touchCameraFrame([...pointers.values()]);
    state = frame ? { distance: frame.distance, midpoint: frame.midpoint } : null;
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !(event.target instanceof Node) || !container.contains(event.target)) return;
    pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    try { container.setPointerCapture(event.pointerId); } catch { /* Synthetic events have no active pointer. */ }
    if (!shouldOwnTouchCamera(pointers.size)) return;
    event.preventDefault();
    const current = transformManager.getTransform();
    moveCanvasTo(current.x, current.y, current.scale);
    rebase();
    onCameraStateChange(true);
    trace.action('input:touch-camera-start', { touches: pointers.size });
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (!shouldOwnTouchCamera(pointers.size)) return;
    event.preventDefault();
    const frame = touchCameraFrame([...pointers.values()], state);
    if (!frame) return;
    if (frame.panX !== 0 || frame.panY !== 0) transformManager.pan(frame.panX, frame.panY);
    if (Number.isFinite(frame.zoomFactor) && frame.zoomFactor > 0 && frame.zoomFactor !== 1) {
      const rect = container.getBoundingClientRect();
      transformManager.zoomByFactor(frame.midpoint.x - rect.left, frame.midpoint.y - rect.top, frame.zoomFactor);
    }
    state = { distance: frame.distance, midpoint: frame.midpoint };
  };
  const onPointerEnd = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;
    try { container.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released. */ }
    if (shouldOwnTouchCamera(pointers.size)) rebase();
    else reset();
  };
  const onBlur = () => {
    for (const id of pointers.keys()) {
      try { container.releasePointerCapture(id); } catch { /* Already released. */ }
    }
    pointers.clear();
    reset();
  };
  // Capture before header/object pointer handlers. Camera ownership is based
  // on identifiers, so 3→2 fingers rebases rather than jumping between slots.
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('pointerup', onPointerEnd, true);
  window.addEventListener('pointercancel', onPointerEnd, true);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerup', onPointerEnd, true);
    window.removeEventListener('pointercancel', onPointerEnd, true);
    window.removeEventListener('blur', onBlur);
    onBlur();
  };
}

