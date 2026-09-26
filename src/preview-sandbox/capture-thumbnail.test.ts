import { describe, test, expect } from 'vitest';
import { captureScale, captureViewportSize } from './capture-thumbnail';

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
