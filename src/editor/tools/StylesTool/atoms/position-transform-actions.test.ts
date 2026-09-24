import { describe, expect, it } from 'vitest';
import { replaceCssRotate, toggleCssAxisFlip } from './RotateControl';

describe('Position transform actions', () => {
  it('replaces rotation without destroying other transforms', () => {
    expect(replaceCssRotate('translateX(-50%) rotate(20deg) scale(2)', 90))
      .toBe('translateX(-50%) rotate(90deg) scale(2)');
  });

  it('removes only rotation at zero', () => {
    expect(replaceCssRotate('translateY(-50%) rotate(20deg) scaleX(-1)', 0))
      .toBe('translateY(-50%) scaleX(-1)');
  });

  it('toggles a horizontal flip in place', () => {
    expect(toggleCssAxisFlip('rotate(30deg) scaleX(-1)', 'x'))
      .toBe('rotate(30deg)');
    expect(toggleCssAxisFlip('rotate(30deg)', 'x'))
      .toBe('rotate(30deg) scaleX(-1)');
  });

  it('preserves a uniform scale while flipping one axis', () => {
    expect(toggleCssAxisFlip('rotate(15deg) scale(2)', 'y'))
      .toBe('rotate(15deg) scale(2, -2)');
  });
});
