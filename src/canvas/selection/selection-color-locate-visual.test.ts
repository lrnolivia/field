import { describe, expect, it } from 'vitest';
import { locateColorLuminance, resolveLocateLuminousRgb } from './selection-color-locate-visual';

describe('Selection color locate luminous tint', () => {
  it('turns pure blue into a lighter, less saturated electric blue', () => {
    const rgb = resolveLocateLuminousRgb('#0000FF', 'white');
    expect(rgb[0]).toBeGreaterThan(70);
    expect(rgb[1]).toBeGreaterThan(70);
    expect(rgb[2]).toBeGreaterThan(rgb[0]);
    expect(rgb[2]).toBeLessThan(245);
  });

  it('lifts dark red without preserving harsh full saturation', () => {
    const [r, g, b] = resolveLocateLuminousRgb('#6C0606', 'white');
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(50);
    expect(b).toBeGreaterThan(50);
  });

  it('keeps black and white neutral', () => {
    expect(resolveLocateLuminousRgb('#000000', 'white')).toEqual([82, 84, 90]);
    expect(resolveLocateLuminousRgb('#ffffff', 'black')).toEqual([246, 247, 249]);
  });

  it('ignores effectively transparent colors', () => {
    expect(locateColorLuminance('rgba(255, 0, 0, 0)')).toBeNull();
    expect(locateColorLuminance('#ff000000')).toBeNull();
  });
});
