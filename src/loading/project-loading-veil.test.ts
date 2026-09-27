import { describe, expect, it } from 'vitest';
import {
  LOADING_VEIL_FRAGMENT_SHADER,
  LOADING_VEIL_VERTEX_SHADER,
  loadingVeilShouldShowDetails,
  parseLoadingVeilColor,
} from './ProjectLoadingVeil';

describe('ProjectLoadingVeil', () => {
  it('parses field theme accent colors for the shader', () => {
    expect(parseLoadingVeilColor('#b5471f')).toEqual([
      181 / 255,
      71 / 255,
      31 / 255,
    ]);
    expect(parseLoadingVeilColor('#abc')).toEqual([
      170 / 255,
      187 / 255,
      204 / 255,
    ]);
    expect(parseLoadingVeilColor('rgb(28, 140, 147)')).toEqual([
      28 / 255,
      140 / 255,
      147 / 255,
    ]);
  });

  it('keeps routine loading visually quiet and reveals only actionable detail', () => {
    expect(loadingVeilShouldShowDetails()).toBe(false);
    expect(loadingVeilShouldShowDetails(undefined, false)).toBe(false);
    expect(loadingVeilShouldShowDetails('Canvas is taking longer to start')).toBe(true);
    expect(loadingVeilShouldShowDetails(undefined, true)).toBe(true);
  });

  it('ships the mesh as native WebGL2 shader source with organic distortion and grain', () => {
    expect(LOADING_VEIL_VERTEX_SHADER).toContain('#version 300 es');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('#version 300 es');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('fbm');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('u_accent');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('grain');
  });
});
