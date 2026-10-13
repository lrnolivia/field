import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import { mergeResponsiveStyleValues, responsiveStyleValuesAtWidth } from './responsive-style-values';

describe('inline responsive Inspector values', () => {
  const node = {
    responsiveStyleValues: { backgroundColor: { 600: 'red', 900: 'blue' } },
    responsiveStyleBands: { backgroundColor: { 600: 0, 900: 601 } },
  } as unknown as CanvasNode;

  it('shows the active tile value without changing the base style', () => {
    const base = { backgroundColor: 'white', color: 'black' };
    expect(mergeResponsiveStyleValues(base, node, 600)).toEqual({ backgroundColor: 'red', color: 'black' });
    expect(mergeResponsiveStyleValues(base, node, 601)).toEqual({ backgroundColor: 'blue', color: 'black' });
    expect(mergeResponsiveStyleValues(base, node, 1000)).toBe(base);
  });

  it('does not show an override outside its authored band', () => {
    expect(responsiveStyleValuesAtWidth(node, 1000)).toBeNull();
  });
});
