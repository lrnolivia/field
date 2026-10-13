// InputHandler.pan.test.ts — trackpad / wheel pan normalization regression coverage.

import { describe, it, expect } from 'vitest';
import { wheelPanDelta } from './InputHandler';
import { PAN_LINE_STEP_PX, PAN_TRACKPAD_GAIN_CUTOFF, PAN_TRACKPAD_MAX_GAIN } from './constants';

const viewport = { width: 1000, height: 800 };
const ev = (deltaX: number, deltaY: number, deltaMode = 0) => ({ deltaX, deltaY, deltaMode });

describe('wheelPanDelta', () => {
  it('amplifies tiny high-resolution pixel deltas for responsive trackpad movement', () => {
    const out = wheelPanDelta(ev(4, -8), viewport);
    expect(out.gain).toBeGreaterThan(1);
    expect(out.gain).toBeLessThanOrEqual(PAN_TRACKPAD_MAX_GAIN);
    expect(out.dx).toBeLessThan(-4);
    expect(out.dy).toBeGreaterThan(8);
  });

  it('uses one shared gain so diagonal gesture direction is preserved', () => {
    const out = wheelPanDelta(ev(10, 20), viewport);
    expect(out.dx / out.dy).toBeCloseTo(0.5, 12);
  });

  it('smoothly reduces gain as pixel deltas approach the cutoff', () => {
    const tiny = wheelPanDelta(ev(0, 5), viewport);
    const medium = wheelPanDelta(ev(0, 40), viewport);
    const nearCutoff = wheelPanDelta(ev(0, PAN_TRACKPAD_GAIN_CUTOFF - 1), viewport);
    expect(tiny.gain).toBeGreaterThan(medium.gain);
    expect(medium.gain).toBeGreaterThan(nearCutoff.gain);
    expect(nearCutoff.gain).toBeGreaterThan(1);
  });

  it('keeps large mouse-style pixel notches at the existing 1× speed', () => {
    const atCutoff = wheelPanDelta(ev(0, PAN_TRACKPAD_GAIN_CUTOFF), viewport);
    const notch = wheelPanDelta(ev(0, 100), viewport);
    expect(atCutoff.gain).toBe(1);
    expect(atCutoff.dy).toBe(-PAN_TRACKPAD_GAIN_CUTOFF);
    expect(notch.gain).toBe(1);
    expect(notch.dy).toBe(-100);
  });

  it('normalizes line-mode wheel input to pixels without trackpad gain', () => {
    const out = wheelPanDelta(ev(2, -3, 1), viewport);
    expect(out.gain).toBe(1);
    expect(out.dx).toBe(-2 * PAN_LINE_STEP_PX);
    expect(out.dy).toBe(3 * PAN_LINE_STEP_PX);
  });

  it('normalizes page-mode wheel input against the canvas viewport', () => {
    const out = wheelPanDelta(ev(0.5, -1, 2), viewport);
    expect(out.gain).toBe(1);
    expect(out.dx).toBe(-500);
    expect(out.dy).toBe(800);
  });

  it('is monotonic across the high-resolution gain curve', () => {
    const magnitudes = [1, 5, 10, 20, 40, 60, 79, 80, 100];
    const moved = magnitudes.map((d) => Math.abs(wheelPanDelta(ev(0, d), viewport).dy));
    for (let i = 1; i < moved.length; i++) {
      expect(moved[i]).toBeGreaterThan(moved[i - 1]);
    }
  });

  it('keeps zero delta a no-op', () => {
    const out = wheelPanDelta(ev(0, 0), viewport);
    expect(Math.abs(out.dx)).toBe(0);
    expect(Math.abs(out.dy)).toBe(0);
  });
});
