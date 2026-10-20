// transform/TransformManager.ts — Core pan/zoom state for infinite canvas.
// Pure imperative singleton — no React, no Jotai.
// Everything else reads from this via getTransform() and subscribes via subscribe().
//
// Uses requestAnimationFrame batching so multiple pan+zoom calls in one frame
// only trigger one DOM update.
//
// STAGED CAMERA. Canvas content lives in a cross-origin sandbox iframe that is
// reached by postMessage and applies each camera on ITS next frame. The
// editor's own camera-tracked layers (viewport headers, Frame labels,
// selection chrome) used to apply the same camera one frame EARLIER, so they
// slid ahead of the content by one pan step on every moving frame. With a
// forwarder attached, a frame now (1) lands the camera forwarded last frame —
// the one the sandbox paints this frame — on elements + subscribers, then
// (2) forwards the newest input camera. `getTransform()` stays the newest
// input camera (gesture math); `getAppliedTransform()` is what is on screen.

import { MIN_SCALE, MAX_SCALE } from './constants';
import { clamp } from '@/shared/math-utils';
import type { Transform } from '@/shared/types';

export type { Transform };

/**
 * After a scale change settles, wait this long before clearing `will-change`
 * on viewport roots so Chrome re-rasterizes at the new scale. Lower = sharper
 * faster but more raster work mid-gesture; higher = smoother gesture but
 * stays blurry longer after release.
 */
const ZOOM_END_DEBOUNCE_MS = 180;

export interface CameraForwarder {
  /** Send a camera to the sandbox; false when it can't be reached (the editor
   *  then applies immediately — there is nothing to stay in step with). */
  send(t: Transform): boolean;
  /** A camera landed on screen — runs before subscribers are notified. */
  land?(t: Transform): void;
}

export class TransformManager {
  private transform: Transform = { x: 200, y: 100, scale: 0.5 };
  /** The camera currently painted (elements + subscribers). */
  private applied: Transform = { ...this.transform };
  /** Forwarded to the sandbox last frame; lands on the editor this frame. */
  private staged: Transform | null = null;
  private dirty = false;
  private forwarder: CameraForwarder | null = null;
  private listeners: Set<() => void> = new Set();
  private elements: HTMLElement[] = [];
  private rafId: number | null = null;
  private zoomEndTimer: number | null = null;
  private isZooming = false;

  // ─── Read ───────────────────────────────────────────────────────────

  /** Newest input camera — use for gesture / input math. */
  getTransform(): Transform {
    return { ...this.transform };
  }

  /** Camera currently on screen — use when PAINTING editor layers that must
   *  stay locked to the sandbox content. */
  getAppliedTransform(): Transform {
    return { ...this.applied };
  }

  /** Attach the sandbox forwarder (null detaches). */
  setForwarder(fn: CameraForwarder | null): void {
    this.forwarder = fn;
    if (!fn && this.staged) {
      this.staged = null;
      this.dirty = true;
      this.scheduleFlush();
    }
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  // ─── Elements ───────────────────────────────────────────────────────

  /** Register an element to receive transform updates (content div, viewport overlay, etc.) */
  addElement(el: HTMLElement): void {
    if (!this.elements.includes(el)) {
      this.elements.push(el);
      this.applyToElement(el);
    }
  }

  /** Unregister an element */
  removeElement(el: HTMLElement): void {
    this.elements = this.elements.filter(e => e !== el);
  }

  /** Apply current transform to a single element */
  applyToElement(el: HTMLElement): void {
    const { x, y, scale } = this.applied;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    el.style.transformOrigin = '0 0';
  }

  // ─── Mutate ─────────────────────────────────────────────────────────

  /** Pan by screen-space delta (mouse/touch movement) */
  pan(dx: number, dy: number): void {
    this.transform.x += dx;
    this.transform.y += dy;
    this.scheduleFlush();
  }

  /**
   * Zoom at a screen-space anchor point (mouse position relative to container).
   * Keeps the point under the cursor fixed.
   *
   * @param anchorX — screen X relative to container left
   * @param anchorY — screen Y relative to container top
   * @param scaleDelta — additive scale change (positive = zoom in, negative = zoom out)
   */
  zoom(anchorX: number, anchorY: number, scaleDelta: number): void {
    const { x, y, scale } = this.transform;
    const newScale = clamp(scale + scaleDelta, MIN_SCALE, MAX_SCALE);

    // Canvas point under the anchor before zoom
    const canvasX = (anchorX - x) / scale;
    const canvasY = (anchorY - y) / scale;

    // Adjust pan so the same canvas point stays under the anchor
    this.transform.x = anchorX - canvasX * newScale;
    this.transform.y = anchorY - canvasY * newScale;
    this.transform.scale = newScale;

    if (newScale !== scale) this.beginZooming();
    this.scheduleFlush();
  }

  /**
   * Zoom using a multiplicative factor (for pinch gestures).
   * factor > 1 = zoom in, factor < 1 = zoom out.
   */
  zoomByFactor(anchorX: number, anchorY: number, factor: number): void {
    const { x, y, scale } = this.transform;
    const newScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);

    const canvasX = (anchorX - x) / scale;
    const canvasY = (anchorY - y) / scale;

    this.transform.x = anchorX - canvasX * newScale;
    this.transform.y = anchorY - canvasY * newScale;
    this.transform.scale = newScale;

    if (newScale !== scale) this.beginZooming();
    this.scheduleFlush();
  }

  /** Set transform directly (for animations, restore, etc.) */
  setTransform(t: Transform): void {
    const wasScale = this.transform.scale;
    this.transform = { ...t };
    if (this.transform.scale !== wasScale) this.beginZooming();
    this.scheduleFlush();
  }

  // ─── Internal ───────────────────────────────────────────────────────

  /**
   * Called whenever scale changes. Promotes viewport roots to GPU layers
   * (`will-change: transform`) so the in-flight zoom is composited from
   * the cached bitmap (smooth but blurry while zooming). After a debounce
   * with no further scale change, the flag is removed so Chrome
   * re-rasterizes each viewport at the new scale (sharp text/borders).
   *
   * Why not leave will-change set permanently?
   *   Chrome auto re-rasterizes on transform scale change ONLY when
   *   will-change is NOT set. With will-change, it keeps the cached
   *   bitmap and stretches it = pixelated text at any zoom > 100%.
   *   See https://developer.chrome.com/blog/re-rastering-composite.
   *
   * Why not always remove will-change?
   *   Mid-gesture, the re-raster is expensive and creates jank during
   *   continuous zoom. The debounce keeps the gesture smooth and only
   *   pays the raster cost once when the user stops.
   */
  private beginZooming(): void {
    const targets = document.querySelectorAll<HTMLElement>(
      '[data-viewport]:not([data-overlay-portal])',
    );
    if (!this.isZooming) {
      this.isZooming = true;
      for (const el of targets) el.style.willChange = 'transform';
    }
    if (this.zoomEndTimer !== null) {
      clearTimeout(this.zoomEndTimer);
    }
    this.zoomEndTimer = window.setTimeout(() => {
      this.zoomEndTimer = null;
      this.isZooming = false;
      const settled = document.querySelectorAll<HTMLElement>(
        '[data-viewport]:not([data-overlay-portal])',
      );
      for (const el of settled) el.style.willChange = '';
    }, ZOOM_END_DEBOUNCE_MS);
  }

  private scheduleFlush(): void {
    this.dirty = true;
    this.requestTick();
  }

  private requestTick(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.tick();
    });
  }

  private tick(): void {
    // 1. Land last frame's forwarded camera — the sandbox paints it now.
    if (this.staged) {
      this.land(this.staged);
      this.staged = null;
    }
    if (!this.dirty) return;
    this.dirty = false;
    // 2. Forward the newest input camera; it lands here next frame.
    const next = { ...this.transform };
    if (this.forwarder?.send(next)) {
      this.staged = next;
      this.requestTick();
    } else {
      this.land(next);
    }
  }

  private land(t: Transform): void {
    this.applied = t;
    this.forwarder?.land?.(t);
    for (const el of this.elements) {
      this.applyToElement(el);
    }
    this.notify();
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }
}

export const transformManager = new TransformManager();
