import { describe, expect, it } from 'vitest';
import { locateColorLuminance, resolveLocateDefinitionGlow } from './selection-color-locate-visual';

describe('Selection color locate definition glow', () => {
  it('uses screen for a real non-extreme paint color', () => {
    expect(resolveLocateDefinitionGlow('#6C0606', 'white')).toEqual({
      stroke: '#6C0606',
      blendMode: 'screen',
    });
  });

  it('uses overlay for black paints', () => {
    expect(resolveLocateDefinitionGlow('#000000', 'white')).toEqual({
      stroke: '#000000',
      blendMode: 'overlay',
    });
  });

  it('uses soft-light for white paints', () => {
    expect(resolveLocateDefinitionGlow('#ffffff', 'black')).toEqual({
      stroke: '#ffffff',
      blendMode: 'soft-light',
    });
  });

  it('falls back to the contrast tone for unresolved variable colors', () => {
    expect(resolveLocateDefinitionGlow('var(--brand)', 'black')).toEqual({
      stroke: 'black',
      blendMode: 'overlay',
    });
    expect(resolveLocateDefinitionGlow(null, 'white')).toEqual({
      stroke: 'white',
      blendMode: 'soft-light',
    });
  });

  it('ignores effectively transparent colors', () => {
    expect(locateColorLuminance('rgba(255, 0, 0, 0)')).toBeNull();
    expect(locateColorLuminance('#ff000000')).toBeNull();
  });
});
