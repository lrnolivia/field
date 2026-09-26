import { describe, test, expect } from 'vitest';
import { captureScale, captureViewportSize } from './capture-thumbnail';

describe('dashboard thumbnail capture sizing', () => {
  test('targets a compact retina-safe dashboard raster', () => {
    expect(captureScale(1440)).toBeCloseTo(0.5);
    expect(captureScale(1800)).toBeCloseTo(0.4);
  });

  test('never upscales narrow viewports', () => {
    expect(captureScale(720)).toBe(1);
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
