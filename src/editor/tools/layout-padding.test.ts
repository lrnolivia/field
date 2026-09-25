import { describe, expect, it } from 'vitest';
import {
  collapsePaddingToAxes,
  normalizePaddingPx,
  paddingAxisCompatible,
  setPaddingAxis,
  setPaddingSide,
} from './layout-padding';

describe('Auto layout padding source writes', () => {
  const sides: [string, string, string, string] = ['8px', '16px', '8px', '16px'];

  it('writes horizontal padding to left and right without touching vertical values', () => {
    expect(setPaddingAxis(sides, 'horizontal', '24')).toEqual({
      padding: '', paddingTop: '8px', paddingRight: '24px', paddingBottom: '8px', paddingLeft: '24px',
    });
  });

  it('writes vertical padding to top and bottom', () => {
    expect(setPaddingAxis(sides, 'vertical', '12')).toEqual({
      padding: '', paddingTop: '12px', paddingRight: '16px', paddingBottom: '12px', paddingLeft: '16px',
    });
  });

  it('writes one independent side while preserving the other three', () => {
    expect(setPaddingSide(sides, 3, '30')).toEqual({
      padding: '', paddingTop: '8px', paddingRight: '16px', paddingBottom: '8px', paddingLeft: '30px',
    });
  });

  it('detects whether the compact axis-pair representation is lossless', () => {
    expect(paddingAxisCompatible(sides)).toBe(true);
    expect(paddingAxisCompatible(['8px', '16px', '9px', '16px'])).toBe(false);
  });

  it('collapses independent sides deterministically using top/right as the chosen axes', () => {
    expect(collapsePaddingToAxes(['8px', '16px', '12px', '20px'])).toEqual({
      padding: '', paddingTop: '8px', paddingRight: '16px', paddingBottom: '8px', paddingLeft: '16px',
    });
  });

  it('clamps padding to the supported non-negative px range', () => {
    expect(normalizePaddingPx('-5')).toBe('0px');
    expect(normalizePaddingPx('1200')).toBe('999px');
  });
});
