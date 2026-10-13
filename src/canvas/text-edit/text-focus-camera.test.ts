import { beforeEach, describe, expect, it, vi } from 'vitest';

const { animateCanvasTo, getTransform, focusScreenRect, followScreenRect, followCaretScreenRect, findNodeRect } = vi.hoisted(() => ({
  animateCanvasTo: vi.fn(),
  getTransform: vi.fn(() => ({ x: 20, y: 30, scale: 1 })),
  focusScreenRect: vi.fn(),
  followScreenRect: vi.fn(),
  followCaretScreenRect: vi.fn(),
  findNodeRect: vi.fn(() => ({ left: 100, top: 100, width: 80, height: 20 })),
}));

vi.mock('../transform/CameraAnimator', () => ({ animateCanvasTo }));
vi.mock('../transform/TransformManager', () => ({ transformManager: { getTransform } }));
vi.mock('../node-ops', () => ({ findNodeRect }));
vi.mock('../transform/CameraCommands', () => ({
  focusScreenRect,
  followScreenRect,
  followCaretScreenRect,
  getPaddedCanvasFocusArea: () => ({ width: 800, height: 600, centerX: 500, centerY: 400 }),
}));

import { signalUserCameraIntent } from '../transform/camera-intent';
import { TextFocusCamera } from './text-focus-camera';

describe('TextFocusCamera', () => {
  beforeEach(() => {
    animateCanvasTo.mockClear();
    getTransform.mockClear();
    focusScreenRect.mockClear();
    followScreenRect.mockClear();
    followCaretScreenRect.mockClear();
    findNodeRect.mockReset();
    findNodeRect.mockReturnValue({ left: 100, top: 100, width: 80, height: 20 });
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
    expect(followScreenRect).toHaveBeenCalledWith(expect.objectContaining({ width: 80, height: 20 }), 1);
    focus.dispose();
    raf.mockRestore();
  });

  it('re-evaluates the focus envelope after workspace geometry changes', () => {
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    const focus = new TextFocusCamera(() => document.createElement('iframe'), () => false);
    focus.begin('text', 'desktop');
    callbacks.shift()?.(0);
    focus.updateViewport();
    callbacks.shift()?.(16);
    expect(followScreenRect).not.toHaveBeenCalled();
    callbacks.shift()?.(32);
    expect(followScreenRect).toHaveBeenCalledWith(expect.objectContaining({ width: 80, height: 20 }), 1);
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

  it('yields permanently to an explicit user camera command during text editing', () => {
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    const focus = new TextFocusCamera(() => document.createElement('iframe'), () => false);
    focus.begin('text', 'desktop');
    callbacks.shift()?.(0);

    signalUserCameraIntent('test:user-command');
    focus.update();
    focus.updateViewport();
    focus.updateCaret(new DOMRect(760, 700, 2, 20));
    callbacks.splice(0).forEach((cb) => cb(16));
    focus.end();
    callbacks.splice(0).forEach((cb) => cb(32));

    expect(followScreenRect).not.toHaveBeenCalled();
    expect(followCaretScreenRect).not.toHaveBeenCalled();
    expect(animateCanvasTo).not.toHaveBeenCalledWith(20, 30, 1, 320, { focus: true });
    focus.dispose();
    raf.mockRestore();
  });

  it('switches oversized text to caret follow at the pre-edit camera floor', () => {
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    findNodeRect.mockReturnValue({ left: 20, top: 20, width: 1200, height: 1000 });
    const focus = new TextFocusCamera(() => document.createElement('iframe'), () => false);
    focus.begin('text', 'desktop');
    callbacks.shift()?.(0);
    focus.updateCaret(new DOMRect(760, 700, 2, 20));
    callbacks.shift()?.(16);
    callbacks.shift()?.(32);
    expect(followCaretScreenRect).toHaveBeenCalledTimes(1);
    expect(followScreenRect).not.toHaveBeenCalled();
    focus.dispose();
    raf.mockRestore();
  });

  it('keeps whole-object follow for ordinary text even when caret geometry exists', () => {
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    const focus = new TextFocusCamera(() => document.createElement('iframe'), () => false);
    focus.begin('text', 'desktop');
    callbacks.shift()?.(0);
    focus.updateCaret(new DOMRect(500, 400, 2, 20));
    callbacks.shift()?.(16);
    callbacks.shift()?.(32);
    expect(followScreenRect).toHaveBeenCalledWith(expect.objectContaining({ width: 80, height: 20 }), 1);
    expect(followCaretScreenRect).not.toHaveBeenCalled();
    focus.dispose();
    raf.mockRestore();
  });

  it('defers restore by one frame so a direct text-to-text handoff can cancel the bounce', () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let id = 0;
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { id += 1; callbacks.set(id, callback); return id; });
    const caf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => { callbacks.delete(frameId); });
    const focus = new TextFocusCamera(() => document.createElement('iframe'), () => false);
    focus.begin('text-a', 'desktop');
    for (const [frameId, cb] of [...callbacks]) { callbacks.delete(frameId); cb(0); }
    focus.end();
    focus.begin('text-b', 'desktop');
    for (const [frameId, cb] of [...callbacks]) { callbacks.delete(frameId); cb(16); }
    expect(animateCanvasTo).not.toHaveBeenCalledWith(20, 30, 1, 320, { focus: true });
    focus.dispose();
    raf.mockRestore();
    caf.mockRestore();
  });

  it('restores the pre-edit camera after the deferred exit frame', () => {
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    const focus = new TextFocusCamera(() => document.createElement('iframe'), () => false);
    focus.begin('text', 'desktop');
    callbacks.shift()?.(0);
    focus.end();
    expect(animateCanvasTo).not.toHaveBeenCalledWith(20, 30, 1, 320, { focus: true });
    callbacks.shift()?.(16);
    expect(animateCanvasTo).toHaveBeenCalledWith(20, 30, 1, 320, { focus: true });
    focus.dispose();
    raf.mockRestore();
  });

  it('restores the previous view after a wheel gesture over chrome', () => {
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    const chrome = document.createElement('div');
    const canvas = document.createElement('div');
    document.body.append(chrome, canvas);
    const focus = new TextFocusCamera(() => document.createElement('iframe'), (event) => event.target === canvas);
    focus.begin('text', 'desktop');
    callbacks.shift()?.(0);
    chrome.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    focus.end();
    callbacks.shift()?.(16);
    expect(animateCanvasTo).toHaveBeenCalledWith(20, 30, 1, 320, { focus: true });
    focus.dispose();
    raf.mockRestore();
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
