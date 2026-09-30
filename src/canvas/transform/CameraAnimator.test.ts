import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { setTransform, getTransform, smoothZoomGet, traceFn } = vi.hoisted(() => ({
  setTransform: vi.fn(),
  getTransform: vi.fn(() => ({ x: 10, y: 20, scale: 1 })),
  smoothZoomGet: vi.fn(() => true),
  traceFn: vi.fn(),
}));

vi.mock('./TransformManager', () => ({
  transformManager: { setTransform, getTransform },
}));
vi.mock('@/shared/debug-trace', () => ({
  trace: { fn: traceFn, action: vi.fn() },
}));
vi.mock('jotai', () => ({
  getDefaultStore: () => ({ get: smoothZoomGet }),
}));
vi.mock('@/code/stores/user-preferences-store', () => ({ useSmoothZoomAtom: {} }));

import { animateCanvasTo, prefersReducedCameraMotion } from './CameraAnimator';

describe('CameraAnimator reduced motion', () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    setTransform.mockClear();
    getTransform.mockClear();
    smoothZoomGet.mockClear();
    traceFn.mockClear();
  });

  it('detects the OS reduced-motion preference', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    expect(prefersReducedCameraMotion()).toBe(true);
    matchMedia.mockRestore();
  });

  it('snaps focus motion directly to the exact target under reduced motion', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const iframe = document.createElement('iframe');
    iframe.dataset.canvasIframe = '';
    const animate = vi.fn();
    Object.defineProperty(iframe, 'animate', { configurable: true, value: animate });
    document.body.append(iframe);

    animateCanvasTo(100, 200, 1.5, 360, { focus: true });

    expect(setTransform).toHaveBeenCalledWith({ x: 100, y: 200, scale: 1.5 });
    expect(raf).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();

    iframe.remove();
    raf.mockRestore();
    matchMedia.mockRestore();
  });
});
