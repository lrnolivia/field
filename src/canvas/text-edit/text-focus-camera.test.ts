import { beforeEach, describe, expect, it, vi } from 'vitest';

const { animateCanvasTo, getTransform, focusScreenRect, followScreenRect } = vi.hoisted(() => ({
  animateCanvasTo: vi.fn(),
  getTransform: vi.fn(() => ({ x: 20, y: 30, scale: 1 })),
  focusScreenRect: vi.fn(),
  followScreenRect: vi.fn(),
}));

vi.mock('../transform/CameraAnimator', () => ({ animateCanvasTo }));
vi.mock('../transform/TransformManager', () => ({ transformManager: { getTransform } }));
vi.mock('../node-ops', () => ({ findNodeRect: () => ({ left: 100, top: 100, width: 80, height: 20 }) }));
vi.mock('../transform/CameraCommands', () => ({ focusScreenRect, followScreenRect }));

import { TextFocusCamera } from './text-focus-camera';

describe('TextFocusCamera', () => {
  beforeEach(() => {
    animateCanvasTo.mockClear();
    getTransform.mockClear();
    focusScreenRect.mockClear();
    followScreenRect.mockClear();
  });

  it('delegates text-entry framing to the canonical camera focus primitive', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const focus = new TextFocusCamera(() => document.createElement('iframe'), () => false);
    focus.begin('text', 'desktop');
    expect(focusScreenRect).toHaveBeenCalledWith(
      expect.objectContaining({ left: 100, top: 100, width: 80, height: 20 }),
      'text-edit',
    );
    focus.dispose();
    raf.mockRestore();
  });


  it('follows live text growth after the sandbox rect has had two frames to settle', () => {
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const focus = new TextFocusCamera(() => document.createElement('iframe'), () => false);
    focus.begin('text', 'desktop');
    callbacks.shift()?.(0); // entry focus
    focus.update();
    callbacks.shift()?.(16);
    expect(followScreenRect).not.toHaveBeenCalled();
    callbacks.shift()?.(32);
    expect(followScreenRect).toHaveBeenCalledWith(expect.objectContaining({ width: 80, height: 20 }));
    focus.dispose();
    raf.mockRestore();
  });

  it('stops adaptive follow after a manual canvas wheel gesture', () => {
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    const canvas = document.createElement('div');
    document.body.append(canvas);
    const focus = new TextFocusCamera(() => document.createElement('iframe'), (event) => event.target === canvas);
    focus.begin('text', 'desktop');
    callbacks.shift()?.(0);
    canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    focus.update();
    callbacks.splice(0).forEach((cb) => cb(16));
    expect(followScreenRect).not.toHaveBeenCalled();
    focus.dispose();
    canvas.remove();
    raf.mockRestore();
  });

  it('restores the previous view after a wheel gesture over chrome', () => {
    const chrome = document.createElement('div');
    const canvas = document.createElement('div');
    document.body.append(chrome, canvas);
    const focus = new TextFocusCamera(() => document.createElement('iframe'), (event) => event.target === canvas);
    focus.begin('text', 'desktop');
    chrome.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    focus.end();
    expect(animateCanvasTo).toHaveBeenCalledWith(20, 30, 1, 320, { focus: true });
    chrome.remove();
    canvas.remove();
  });

  it('keeps the manually changed canvas view', () => {
    const canvas = document.createElement('div');
    document.body.append(canvas);
    const focus = new TextFocusCamera(() => document.createElement('iframe'), (event) => event.target === canvas);
    focus.begin('text', 'desktop');
    canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    focus.end();
    expect(animateCanvasTo).not.toHaveBeenCalledWith(20, 30, 1, 320, { focus: true });
    canvas.remove();
  });
});
