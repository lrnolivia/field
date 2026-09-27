import { describe, expect, it } from 'vitest';
import { buildSelectionColorLocateFilter, selectionColorLocateEdgeFilterId } from './selection-color-locate';

describe('sandbox selection-color locate filter', () => {
  it('preserves an existing authored/computed filter and applies the inner white keyline first', () => {
    const value = buildSelectionColorLocateFilter('blur(2px)', [110, 120, 230], 'white', 1);
    expect(value.startsWith('blur(2px) ')).toBe(true);
    expect(value).toContain('url(#field-selection-color-locate-edge-white)');
    expect(selectionColorLocateEdgeFilterId()).toBe('field-selection-color-locate-edge-white');
  });

  it('builds exactly three geometry-following glow radii at 0.5x, 1x, and 1.5x', () => {
    const value = buildSelectionColorLocateFilter('none', [110, 120, 230], 'white', 1);
    expect(value).toContain('drop-shadow(0 0 1.18px');
    expect(value).toContain('drop-shadow(0 0 2.35px rgba(110, 120, 230, 0.920))');
    expect(value).toContain('drop-shadow(0 0 3.53px rgba(110, 120, 230, 0.560))');
    expect((value.match(/drop-shadow\(/g) ?? []).length).toBe(3);
  });

  it('makes the front glow substantially brighter than the two broader layers', () => {
    const value = buildSelectionColorLocateFilter('none', [110, 120, 230], 'black', 1);
    expect(value).toContain('drop-shadow(0 0 1.18px');
    expect(value).toContain('1.000)');
    expect(value).toContain('0.920)');
    expect(value).toContain('0.560)');
  });
});
