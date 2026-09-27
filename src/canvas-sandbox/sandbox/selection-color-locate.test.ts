import { describe, expect, it } from 'vitest';
import { buildSelectionColorLocateFilter, selectionColorLocateEdgeFilterId } from './selection-color-locate';

describe('sandbox selection-color locate Figma pass', () => {
  it('preserves existing filters and applies the white inner edge first', () => {
    const value = buildSelectionColorLocateFilter('blur(2px)', [0, 0, 255], 'white', 1);
    expect(value.startsWith('blur(2px) ')).toBe(true);
    expect(value).toContain('url(#field-selection-color-locate-edge-white)');
    expect(selectionColorLocateEdgeFilterId()).toBe('field-selection-color-locate-edge-white');
  });

  it('keeps three same-color normal-composited glow layers', () => {
    const value = buildSelectionColorLocateFilter('none', [0, 0, 255], 'white', 1, 1);
    expect(value).toContain('drop-shadow(0 0 1.18px rgba(0, 0, 255, 0.940))');
    expect(value).toContain('drop-shadow(0 0 2.35px rgba(0, 0, 255, 0.720))');
    expect(value).toContain('drop-shadow(0 0 3.53px rgba(0, 0, 255, 0.380))');
    expect((value.match(/drop-shadow\(/g) ?? []).length).toBe(3);
  });

  it('expands radius when animation strength peaks', () => {
    const low = buildSelectionColorLocateFilter('none', [255, 0, 0], 'white', 1, 0.78);
    const peak = buildSelectionColorLocateFilter('none', [255, 0, 0], 'white', 1, 1.32);
    expect(low).toContain('drop-shadow(0 0 0.92px');
    expect(peak).toContain('drop-shadow(0 0 1.55px');
  });
});
