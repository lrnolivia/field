// InputHandler.touch.test.ts — mobile two-finger camera gesture geometry.

import { describe, expect, it } from 'vitest';
import { shouldOwnTouchCamera, touchCameraFrame, type TouchPoint } from './InputHandler';

const p = (clientX: number, clientY: number): TouchPoint => ({ clientX, clientY });

describe('mobile touch camera contract', () => {
  it('does not steal a one-finger gesture from selection/object interaction', () => {
    expect(shouldOwnTouchCamera(0)).toBe(false);
    expect(shouldOwnTouchCamera(1)).toBe(false);
    expect(shouldOwnTouchCamera(2)).toBe(true);
    expect(touchCameraFrame([p(20, 30)])).toBeNull();
  });

  it('establishes a two-finger baseline without moving the camera', () => {
    const frame = touchCameraFrame([p(0, 0), p(100, 0)]);
    expect(frame).toEqual({
      distance: 100,
      midpoint: { x: 50, y: 0 },
      panX: 0,
      panY: 0,
      zoomFactor: 1,
    });
  });

  it('maps midpoint movement to screen-space camera pan', () => {
    const previous = { distance: 100, midpoint: { x: 50, y: 20 } };
    const frame = touchCameraFrame([p(20, 30), p(120, 30)], previous);
    expect(frame?.panX).toBe(20);
    expect(frame?.panY).toBe(10);
    expect(frame?.zoomFactor).toBe(1);
  });

  it('maps finger separation to multiplicative pinch zoom', () => {
    const previous = { distance: 100, midpoint: { x: 50, y: 0 } };
    const frame = touchCameraFrame([p(-50, 0), p(150, 0)], previous);
    expect(frame?.midpoint).toEqual({ x: 50, y: 0 });
    expect(frame?.zoomFactor).toBe(2);
    expect(frame?.panX).toBe(0);
    expect(frame?.panY).toBe(0);
  });

  it('can pan and pinch in the same frame', () => {
    const previous = { distance: 100, midpoint: { x: 50, y: 50 } };
    const frame = touchCameraFrame([p(30, 60), p(180, 60)], previous);
    expect(frame?.midpoint).toEqual({ x: 105, y: 60 });
    expect(frame?.panX).toBe(55);
    expect(frame?.panY).toBe(10);
    expect(frame?.zoomFactor).toBe(1.5);
  });

  it('fails safe when a degenerate baseline has zero distance', () => {
    const previous = { distance: 0, midpoint: { x: 10, y: 10 } };
    const frame = touchCameraFrame([p(0, 0), p(100, 0)], previous);
    expect(frame?.zoomFactor).toBe(1);
    expect(frame?.panX).toBe(0);
    expect(frame?.panY).toBe(0);
  });
});
