// transform/CameraAnimator.ts — Smooth animated camera transitions.
// Eased zoom/pan with cancellation support.
// All camera commands that need animation go through here.

import { transformManager } from './TransformManager';
import { trace } from '@/shared/debug-trace';
import { getDefaultStore } from 'jotai';
import { useSmoothZoomAtom } from '@/code/stores/user-preferences-store';
import { interpolateZoom } from 'd3-interpolate';

/** Ease-out cubic: fast start, smooth deceleration */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function prefersReducedCameraMotion(): boolean {
  return typeof window !== 'undefined'
    && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
}

let animationFrameId: number | null = null;
let blurAnimation: Animation | null = null;
const onAnimStart: (() => void) | null = null;
const onAnimEnd: (() => void) | null = null;

/** Cancel any running animation */
function cancelAnimation(): void {
  blurAnimation?.cancel();
  blurAnimation = null;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    trace.action('camera:animation-cancelled');
  }
}

/**
 * Move camera instantly (no animation).
 */
export function moveCanvasTo(x: number, y: number, scale: number): void {
  cancelAnimation();
  trace.fn('camera.moveCanvasTo', { x, y, scale });
  transformManager.setTransform({ x, y, scale });
}

/**
 * Animate camera to target position with easing.
 * @param duration — animation duration in ms (default 300)
 */
export function animateCanvasTo(
  targetX: number,
  targetY: number,
  targetScale: number,
  duration: number = 300,
  options: { focus?: boolean } = {},
): void {
  cancelAnimation();

  // Reduced-motion is stronger than field's smooth-zoom preference and applies
  // to focus transitions too. Preserve the exact final transform while removing
  // both tweening and transient focus blur at the shared animation chokepoint.
  if (prefersReducedCameraMotion()) {
    trace.fn('camera.animateCanvasTo:reduced-motion', { targetX, targetY, targetScale });
    moveCanvasTo(targetX, targetY, targetScale);
    return;
  }

  // Smooth-zoom pref OFF → snap directly to the target. Routing through
  // moveCanvasTo skips the easing loop entirely so the user gets
  // single-frame jumps for every zoom-to-fit / Ctrl++/− / variant pan
  // in the codebase. Single chokepoint — every camera command
  // (`zoomIn`/`zoomOut`/`zoomTo100`/`zoomToFit`/`panToNode`/etc.) goes
  // through this function, so flipping the pref controls all of them.
  if (!options.focus && !getDefaultStore().get(useSmoothZoomAtom)) {
    moveCanvasTo(targetX, targetY, targetScale);
    return;
  }

  trace.fn('camera.animateCanvasTo', { targetX, targetY, targetScale, duration });

  onAnimStart?.();

  const start = transformManager.getTransform();
  const startTime = performance.now();
  const anchorX = window.innerWidth / 2;
  const anchorY = window.innerHeight / 2;
  const viewportWidth = Math.max(1, window.innerWidth);
  const focusPath = options.focus ? interpolateZoom(
    [(anchorX - start.x) / start.scale, (anchorY - start.y) / start.scale, viewportWidth / start.scale],
    [(anchorX - targetX) / targetScale, (anchorY - targetY) / targetScale, viewportWidth / targetScale],
  ) : null;
  if (focusPath) {
    const iframe = document.querySelector<HTMLIFrameElement>('[data-canvas-iframe]');
    blurAnimation = iframe?.animate([
      { filter: 'blur(0px)', offset: 0 },
      { filter: `blur(${duration < 350 ? 2.2 : 3.5}px)`, offset: 0.43 },
      { filter: 'blur(0px)', offset: 1 },
    ], { duration, easing: 'ease-in-out' }) ?? null;
  }

  const animate = (currentTime: number) => {
    if (animationFrameId === null) return; // cancelled

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = focusPath ? progress * progress * (3 - 2 * progress) : easeOutCubic(progress);
    const view = focusPath?.(eased);
    const currentScale = view ? viewportWidth / view[2] : start.scale + (targetScale - start.scale) * eased;
    const currentX = view ? anchorX - view[0] * currentScale : start.x + (targetX - start.x) * eased;
    const currentY = view ? anchorY - view[1] * currentScale : start.y + (targetY - start.y) * eased;

    transformManager.setTransform({ x: currentX, y: currentY, scale: currentScale });

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      animationFrameId = null;
      // Ensure final values are exact
      transformManager.setTransform({ x: targetX, y: targetY, scale: targetScale });
      onAnimEnd?.();
      trace.action('camera:animation-complete', { targetX, targetY, targetScale });
    }
  };

  animationFrameId = requestAnimationFrame(animate);
}
