import { describe, expect, it } from 'vitest';
import {
  LOADING_VEIL_BASE,
  LOADING_VEIL_FRAGMENT_SHADER,
  LOADING_VEIL_MESH_BLEND_MODE,
  LOADING_VEIL_VERTEX_SHADER,
  RESHADERS_MESH_FLOW_MONO,
  loadingVeilShouldShowDetails,
  parseLoadingVeilColor,
} from './ProjectLoadingVeil';

describe('ProjectLoadingVeil', () => {
  it('uses the canonical ReShaders Mesh Flow Mono palette and defaults', () => {
    expect(RESHADERS_MESH_FLOW_MONO).toEqual({
      c1: '#2a2a2e',
      c2: '#c9c9cf',
      c3: '#f4f4f6',
      c4: '#7a7a82',
      bg: '#050505',
      warp: 0.5,
      softness: 0.45,
      speed: 0.4,
      vignette: 0.25,
      grain: 0.04,
    });

    expect(LOADING_VEIL_BASE).toBe('#8a8a8a');
    expect(LOADING_VEIL_MESH_BLEND_MODE).toBe('multiply');
  });

  it('parses shader palette colours', () => {
    expect(parseLoadingVeilColor('#2a2a2e')).toEqual([
      42 / 255,
      42 / 255,
      46 / 255,
    ]);
    expect(parseLoadingVeilColor('#abc')).toEqual([
      170 / 255,
      187 / 255,
      204 / 255,
    ]);
  });

  it('keeps routine loading visually quiet and reveals only actionable detail', () => {
    expect(loadingVeilShouldShowDetails()).toBe(false);
    expect(loadingVeilShouldShowDetails(undefined, false)).toBe(false);
    expect(loadingVeilShouldShowDetails('Canvas is taking longer to start')).toBe(true);
    expect(loadingVeilShouldShowDetails(undefined, true)).toBe(true);
  });

  it('ships the actual ReShaders Mesh Flow mechanics instead of a lookalike mesh', () => {
    expect(LOADING_VEIL_VERTEX_SHADER).toContain('#version 300 es');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('#version 300 es');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('snoise');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('pxLab');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('pxRgb');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('pxPost');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('vec2 anchor');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('meshFlow');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('u_softness');
  });
});
