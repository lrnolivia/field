import { beforeEach, describe, expect, it, vi } from 'vitest';

const { animateCanvasTo, getTransform } = vi.hoisted(() => ({
  animateCanvasTo: vi.fn(),
  getTransform: vi.fn(() => ({ x: 20, y: 30, scale: 1 })),
}));

vi.mock('../transform/CameraAnimator', () => ({ animateCanvasTo }));
vi.mock('../transform/TransformManager', () => ({ transformManager: { getTransform } }));
vi.mock('../node-ops', () => ({ findNodeRect: () => ({ left: 100, top: 100, width: 80, height: 20 }) }));
vi.mock('../transform/CameraCommands', () => ({ getPaddedCanvasFocusArea: () => ({ width: 800, height: 600, centerX: 400, centerY: 300 }) }));

import { TextFocusCamera } from './text-focus-camera';

describe('TextFocusCamera', () => {
  beforeEach(() => {
    animateCanvasTo.mockClear();
    getTransform.mockClear();
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
