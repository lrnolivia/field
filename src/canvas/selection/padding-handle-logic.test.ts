import { describe, expect, it } from 'vitest';
import { paddingDragAmount, paddingDragStyles } from './padding-handle-logic';

describe('padding handle gestures', () => {
  const sides: [string, string, string, string] = ['8px', '16px', '24px', '32px'];

  it('edits only the touched side unless a modifier is held', () => {
    expect(paddingDragStyles(sides, 'top', 7, false, false, false)).toMatchObject({
      padding: '', paddingTop: '15px', paddingRight: '16px', paddingBottom: '24px', paddingLeft: '32px',
    });
    expect(paddingDragStyles(sides, 'top', 7, true, false, false)).toMatchObject({
      paddingTop: '15px', paddingRight: '16px', paddingBottom: '31px', paddingLeft: '32px',
    });
    expect(paddingDragStyles(sides, 'top', 7, true, true, false)).toMatchObject({
      paddingTop: '15px', paddingRight: '23px', paddingBottom: '31px', paddingLeft: '39px',
    });
  });

  it('follows the visible padding edge for fixed and hugging frames', () => {
    expect(paddingDragAmount('top', 0, 12, false)).toBe(12);
    expect(paddingDragAmount('top', 0, -12, true)).toBe(12);
    expect(paddingDragAmount('right', -12, 0, false)).toBe(12);
    expect(paddingDragAmount('right', 12, 0, true)).toBe(12);
  });

  it('clamps and uses big nudge with Shift', () => {
    expect(paddingDragStyles(sides, 'left', -50, false, false, true).paddingLeft).toBe('0px');
    expect(paddingDragStyles(sides, 'left', 13, false, false, true).paddingLeft).toBe('50px');
  });
});
