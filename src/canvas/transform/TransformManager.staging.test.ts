// Staged camera: with a sandbox forwarder attached, each input camera is sent
// to the sandbox in one frame and lands on the editor's own layers (elements +
// subscribers) in the NEXT frame — the frame the sandbox paints it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransformManager } from './TransformManager';

let frames: Array<FrameRequestCallback> = [];
function runFrame() {
  const due = frames;
  frames = [];
  for (const cb of due) cb(performance.now());
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => vi.unstubAllGlobals());

describe('TransformManager staged camera', () => {
  it('without a forwarder the camera lands in the same frame', () => {
    const tm = new TransformManager();
    const el = document.createElement('div');
    tm.addElement(el);
    tm.setTransform({ x: 0, y: 0, scale: 1 });
    runFrame();
    tm.pan(10, 5);
    runFrame();
    expect(tm.getAppliedTransform()).toEqual({ x: 10, y: 5, scale: 1 });
    expect(el.style.transform).toBe('translate3d(10px, 5px, 0) scale(1)');
  });

  it('forwards the input camera first and applies it one frame later', () => {
    const tm = new TransformManager();
    tm.setTransform({ x: 0, y: 0, scale: 1 });
    runFrame();
    const sent: Array<{ x: number; y: number; scale: number }> = [];
    tm.setForwarder({ send: (t) => { sent.push(t); return true; } });
    const seen: number[] = [];
    tm.subscribe(() => seen.push(tm.getAppliedTransform().x));

    tm.pan(1, 0);
    runFrame(); // frame N: forwarded, not yet applied
    expect(sent.map((t) => t.x)).toEqual([1]);
    expect(seen).toEqual([]);
    expect(tm.getTransform().x).toBe(1); // input math sees the newest camera
    expect(tm.getAppliedTransform().x).toBe(0);

    tm.pan(1, 0);
    runFrame(); // frame N+1: lands camera 1, forwards camera 2
    expect(seen).toEqual([1]);
    expect(sent.map((t) => t.x)).toEqual([1, 2]);

    runFrame(); // frame N+2: lands camera 2, nothing new to send
    expect(seen).toEqual([1, 2]);
    expect(sent).toHaveLength(2);
    runFrame();
    expect(frames).toHaveLength(0); // loop stops once settled
  });

  it('lands the applied camera before forwarding the next one', () => {
    const tm = new TransformManager();
    tm.setTransform({ x: 0, y: 0, scale: 1 });
    runFrame();
    const order: string[] = [];
    tm.setForwarder({ send: (t) => { order.push(`send ${t.x}`); return true; }, land: (t) => order.push(`land ${t.x}`) });
    tm.subscribe(() => order.push(`apply ${tm.getAppliedTransform().x}`));
    tm.pan(1, 0);
    runFrame();
    tm.pan(1, 0);
    runFrame();
    expect(order).toEqual(['send 1', 'land 1', 'apply 1', 'send 2']);
  });

  it('applies immediately while the forwarder cannot reach the sandbox', () => {
    const tm = new TransformManager();
    tm.setTransform({ x: 0, y: 0, scale: 1 });
    runFrame();
    tm.setForwarder({ send: () => false });
    tm.pan(3, 0);
    runFrame();
    expect(tm.getAppliedTransform().x).toBe(3);
  });
});
