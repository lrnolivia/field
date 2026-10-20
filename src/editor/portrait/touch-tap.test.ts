import { describe, expect, it } from 'vitest';
import { TOUCH_DOUBLE_TAP_MS, isTouchDoubleTap, movedPastTouchTapSlop } from './interaction';

describe('touch tap rules', () => {
  it('keeps normal finger wobble a tap', () => {
    expect(movedPastTouchTapSlop(6, 6)).toBe(false);
    expect(movedPastTouchTapSlop(9, 0)).toBe(false);
    expect(movedPastTouchTapSlop(12, 0)).toBe(true);
  });

  it('accepts a finger-sized double-tap, not a slow or distant one', () => {
    const first = { x: 100, y: 100, time: 1_000 };
    expect(isTouchDoubleTap(first, 118, 112, 1_300)).toBe(true);
    expect(isTouchDoubleTap(first, 150, 100, 1_300)).toBe(false);
    expect(isTouchDoubleTap(first, 101, 100, 1_000 + TOUCH_DOUBLE_TAP_MS)).toBe(false);
    expect(isTouchDoubleTap(null, 100, 100, 1_100)).toBe(false);
  });
});
