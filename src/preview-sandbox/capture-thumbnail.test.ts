import { afterEach, describe, test, expect, vi } from 'vitest';
import { canRasterizeBackgroundVideo, captureScale, captureViewportSize } from './capture-thumbnail';

describe('dashboard thumbnail capture sizing', () => {
  test('downscales wide viewports to the compact card raster width', () => {
    expect(captureScale(1440)).toBeCloseTo(640 / 1440);
    expect(captureScale(1280)).toBeCloseTo(0.5);
  });

  test('never upscales narrow viewports', () => {
    expect(captureScale(640)).toBe(1);
    expect(captureScale(375)).toBe(1);
  });

  test('degenerate scale widths fall back to 1', () => {
    expect(captureScale(0)).toBe(1);
    expect(captureScale(-5)).toBe(1);
  });

  test('captures exactly one viewport and has deterministic fallbacks', () => {
    expect(captureViewportSize(1440, 900)).toEqual({ width: 1440, height: 900 });
    expect(captureViewportSize(375.4, 812.6)).toEqual({ width: 375, height: 813 });
    expect(captureViewportSize(0, 0)).toEqual({ width: 1440, height: 900 });
  });
});

describe('thumbnail video rasterization', () => {
  afterEach(() => vi.restoreAllMocks());

  function createVideo(readyState: number) {
    const video = document.createElement('video');
    Object.defineProperties(video, {
      currentSrc: { value: 'https://media.example.test/background.mp4' },
      readyState: { value: readyState },
    });
    return video;
  }

  test('keeps a decoded, readable frame', () => {
    const drawImage = vi.fn();
    const getImageData = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage, getImageData } as unknown as CanvasRenderingContext2D);
    const video = createVideo(HTMLMediaElement.HAVE_CURRENT_DATA);
    expect(canRasterizeBackgroundVideo(video)).toBe(true);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1, 1);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 1, 1);
  });

  test('skips an unreadable frame or one still loading', () => {
    const getImageData = vi.fn(() => { throw new DOMException('origin', 'SecurityError'); });
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(), getImageData,
    } as unknown as CanvasRenderingContext2D);
    expect(canRasterizeBackgroundVideo(createVideo(HTMLMediaElement.HAVE_METADATA))).toBe(false);
    expect(context).not.toHaveBeenCalled();
    expect(canRasterizeBackgroundVideo(createVideo(HTMLMediaElement.HAVE_CURRENT_DATA))).toBe(false);
    expect(getImageData).toHaveBeenCalledOnce();
  });

  test('keeps an authored poster when the video has no current source', () => {
    const video = document.createElement('video');
    expect(canRasterizeBackgroundVideo(video)).toBe(false);
    video.poster = '/background.jpg';
    expect(canRasterizeBackgroundVideo(video)).toBe(true);
  });
});
