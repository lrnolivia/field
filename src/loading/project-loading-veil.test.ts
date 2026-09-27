import { describe, expect, it } from 'vitest';
import {
  LOADING_VEIL_BACKDROP,
  LOADING_VEIL_LOGO_SRC,
  LOADING_VEIL_MESH_BLEND_MODE,
  loadingVeilShouldShowDetails,
} from './ProjectLoadingVeil';
import { FIGMA_LOADING_FRAME } from './ReshadersMeshFlowLayer';

describe('ProjectLoadingVeil', () => {
  it('uses an untinted blurred 90% grayscale live backdrop', () => {
    expect(LOADING_VEIL_BACKDROP).toEqual({ blurPx: 42, grayscale: 0.9 });
  });

  it('reproduces the placed Figma B instance instead of inventing mesh motion', () => {
    expect(LOADING_VEIL_MESH_BLEND_MODE).toBe('hard-light');
    expect(FIGMA_LOADING_FRAME).toMatchObject({
      fileKey: 'ywgbSYrD0fUcXmREaWjqRw',
      frameNodeId: '8:2679',
      placedInstanceNodeId: '8:2680',
      componentSetNodeId: '8:3',
      frameBlendMode: 'hard-light',
      variantDurationMs: 2000,
      cycleMs: 6000,
      noiseBlendMode: 'soft-light',
      noiseStepMs: 100,
    });
    expect(FIGMA_LOADING_FRAME.monochromeStops).toEqual([
      [0, '#525252'],
      [0.195833, '#3a3a3a'],
      [0.451042, '#ffffff'],
      [0.648958, '#808080'],
      [0.8625, '#7a7a7a'],
    ]);
  });

  it('uses the light monochrome field mark', () => {
    expect(LOADING_VEIL_LOGO_SRC).toBe('/field-brand/monochrome/logo-light-trans.png');
  });

  it('keeps routine loading quiet until status becomes actionable', () => {
    expect(loadingVeilShouldShowDetails()).toBe(false);
    expect(loadingVeilShouldShowDetails('Canvas is taking longer to start')).toBe(true);
    expect(loadingVeilShouldShowDetails(undefined, true)).toBe(true);
  });
});
