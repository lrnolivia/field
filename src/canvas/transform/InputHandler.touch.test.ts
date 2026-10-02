// InputHandler.touch.test.ts — mobile two-finger camera gesture geometry.

import { describe, expect, it, vi } from 'vitest';
import { attachTouchCamera, shouldOwnTouchCamera, touchCameraFrame, type TouchPoint } from './InputHandler';
import { transformManager } from './TransformManager';
import { animateCanvasTo, moveCanvasTo } from './CameraAnimator';

const p = (clientX: number, clientY: number): TouchPoint => ({ clientX, clientY });

describe('mobile touch camera contract', () => {
  it('takes ownership from an animated camera and preserves the finger pan after release', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let id = 0;
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.set(++id, callback);
      return id;
    });
    const caf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(frame => { frames.delete(frame); });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const previous = transformManager.getTransform();
    const detach = attachTouchCamera(container, vi.fn());
    const dispatch = (type: string, pointerId: number, point: TouchPoint) => {
      const event = new Event(type, { cancelable: true, bubbles: true });
      for (const [key, value] of Object.entries({ pointerType: 'touch', pointerId, ...point })) Object.defineProperty(event, key, { value });
      container.dispatchEvent(event);
    };
    try {
      moveCanvasTo(10, 20, 1);
      animateCanvasTo(500, 600, 1, 300, { focus: true });
      dispatch('pointerdown', 1, p(100, 100));
      dispatch('pointerdown', 2, p(200, 100));
      dispatch('pointermove', 1, p(120, 130));
      dispatch('pointermove', 2, p(220, 130));
      dispatch('pointerup', 1, p(120, 130));
      dispatch('pointerup', 2, p(220, 130));
      for (const callback of [...frames.values()]) callback(performance.now() + 1000);
      expect(transformManager.getTransform()).toEqual({ x: 30, y: 50, scale: 1 });
    } finally {
      detach();
      container.remove();
      moveCanvasTo(previous.x, previous.y, previous.scale);
      raf.mockRestore();
      caf.mockRestore();
    }
  });

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
