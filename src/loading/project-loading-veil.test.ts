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

  it('uses the exact rendered Figma B component as the Hard Light mesh source', () => {
    expect(FIGMA_LOADING_FRAME).toMatchObject({
      fileKey: 'ywgbSYrD0fUcXmREaWjqRw',
      frameNodeId: '8:2679',
      meshNodeId: '8:2680',
      noiseNodeId: '8:2683',
      sourceWidth: 4568,
      sourceHeight: 2875,
      meshAsset: '/field-brand/loading/figma-mesh-b.png',
      frameBlendMode: 'hard-light',
      noiseBlendMode: 'soft-light',
    });
    expect(LOADING_VEIL_MESH_BLEND_MODE).toBe('hard-light');
    expect(FIGMA_LOADING_FRAME.movementDurationMs).toBeGreaterThanOrEqual(9000);
  });

  it('uses the monochrome light-background field mark composition', () => {
    expect(LOADING_VEIL_LOGO_SRC).toBe('/field-brand/monochrome/logo-light-trans.png');
  });

  it('keeps routine loading quiet until status becomes actionable', () => {
    expect(loadingVeilShouldShowDetails()).toBe(false);
    expect(loadingVeilShouldShowDetails(undefined, false)).toBe(false);
    expect(loadingVeilShouldShowDetails('Canvas is taking longer to start')).toBe(true);
    expect(loadingVeilShouldShowDetails(undefined, true)).toBe(true);
  });
});
