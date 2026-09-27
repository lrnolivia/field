import { describe, expect, it } from 'vitest';
import { buildSelectionColorLocateFilter, selectionColorLocateEdgeFilterId } from './selection-color-locate';

describe('sandbox selection-color locate filter', () => {
  it('preserves an existing authored/computed filter and adds the alpha-edge + luminous stack', () => {
    const value = buildSelectionColorLocateFilter('blur(2px)', [110, 120, 230], 'white', 1);
    expect(value.startsWith('blur(2px) ')).toBe(true);
    expect(value).toContain('url(#field-selection-color-locate-edge-white)');
    expect(value).toContain('drop-shadow(0 0 0.45px');
    expect(value).toContain('drop-shadow(0 0 1.25px rgba(110, 120, 230, 0.880))');
  });

  it('uses the black alpha-edge filter and a faint black contrast feather on light backgrounds', () => {
    const value = buildSelectionColorLocateFilter('none', [210, 100, 100], 'black', 1);
    expect(value).toContain('url(#field-selection-color-locate-edge-black)');
    expect(value).toContain('rgba(0, 0, 0, 0.180)');
  });

  it('uses separate white/black alpha-edge filter ids', () => {
    expect(selectionColorLocateEdgeFilterId('white')).toBe('field-selection-color-locate-edge-white');
    expect(selectionColorLocateEdgeFilterId('black')).toBe('field-selection-color-locate-edge-black');
  });
});
