import { describe, expect, it } from 'vitest';
import { movedPastTapSlop, shouldOpenTapEditor } from './interaction';

describe('portrait release intent', () => {
  it('opens a stationary object immediately on release without a dwell timer', () => {
    expect(shouldOpenTapEditor({ kind: 'object', moved: false, dragging: false })).toBe(true);
  });
  it('tolerates small jitter but distinguishes deliberate movement', () => {
    expect(movedPastTapSlop(2, 2)).toBe(false);
    expect(movedPastTapSlop(4, 0)).toBe(false);
    expect(movedPastTapSlop(4, 1)).toBe(true);
    expect(movedPastTapSlop(-6, 0)).toBe(true);
  });
  it.each([
    { kind: 'object', moved: true, dragging: false },
    { kind: 'object', moved: false, dragging: true },
    { kind: 'object', moved: false, dragging: false, cancelled: true },
    { kind: 'object', moved: false, dragging: false, textEditing: true },
    { kind: 'pan', moved: false, dragging: false },
    { kind: 'context-menu', moved: false, dragging: false },
    { kind: 'marquee', moved: false, dragging: false },
  ])('does not steal another gesture: %o', input => {
    expect(shouldOpenTapEditor(input)).toBe(false);
  });
});
