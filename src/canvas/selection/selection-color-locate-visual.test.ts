import { describe, expect, it } from 'vitest';
import { locateColorLuminance, resolveLocateGlowRgb } from './selection-color-locate-visual';

describe('Selection color locate Figma-pass glow color', () => {
  it('keeps a real source color when it is distinguishable from a dark backdrop', () => {
    expect(resolveLocateGlowRgb('#0000FF', 'white')).toEqual([0, 0, 255]);
    expect(resolveLocateGlowRgb('#6C0606', 'white')).toEqual([108, 6, 6]);
  });

  it('inverts only when the source color would disappear into the backdrop class', () => {
    expect(resolveLocateGlowRgb('#000000', 'white')).toEqual([255, 255, 255]);
    expect(resolveLocateGlowRgb('#ffffff', 'black')).toEqual([0, 0, 0]);
  });

  it('falls back adaptively when the paint is unresolved', () => {
    expect(resolveLocateGlowRgb('var(--brand)', 'white')).toEqual([255, 255, 255]);
    expect(resolveLocateGlowRgb(null, 'black')).toEqual([0, 0, 0]);
  });

  it('ignores effectively transparent colors', () => {
    expect(locateColorLuminance('rgba(255, 0, 0, 0)')).toBeNull();
    expect(locateColorLuminance('#ff000000')).toBeNull();
  });
});
