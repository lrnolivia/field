import { describe, expect, it } from 'vitest';
import { canAdjustLiteralPaintOpacity, canAdjustPaintOpacity, paintOpacityBase, paintOpacityPercent, serializeLiteralPaintOpacity, serializePaintOpacity, splitPaintOpacity } from './paint-opacity';

describe('paint opacity encoding', () => {
  it('preserves a token reference while changing local opacity', () => {
    expect(serializePaintOpacity('var(--color-brand)', 60)).toBe('color-mix(in srgb, var(--color-brand) 60%, transparent)');
    expect(paintOpacityBase('color-mix(in srgb, var(--color-brand) 60%, transparent)')).toBe('var(--color-brand)');
    expect(paintOpacityPercent('color-mix(in srgb, var(--color-brand) 60%, transparent)')).toBe(60);
  });

  it('collapses a 100 percent paint back to its bare source', () => {
    expect(serializePaintOpacity('color-mix(in srgb, #336699 42%, transparent)', 100)).toBe('#336699');
  });

  it('adopts existing literal alpha without migration', () => {
    const state = splitPaintOpacity('#33669980');
    expect(state.base).toBe('#336699');
    expect(state.opacity).toBeCloseTo(50.2, 1);
    expect(state.adjustable).toBe(true);
  });

  it('keeps literal-alpha edits separate from linked token identity', () => {
    expect(serializeLiteralPaintOpacity('#336699', 50)).toBe('#33669980');
    expect(canAdjustLiteralPaintOpacity('var(--color-brand)')).toBe(false);
  });

  it('does not pretend gradients or images have the same solid-paint opacity model', () => {
    expect(canAdjustPaintOpacity('linear-gradient(red, blue)')).toBe(false);
    expect(canAdjustPaintOpacity('url(/hero.png)')).toBe(false);
  });
});
