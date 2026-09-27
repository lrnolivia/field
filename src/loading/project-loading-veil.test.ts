import { describe, expect, it } from 'vitest';
import {
  LOADING_VEIL_BACKDROP,
  LOADING_VEIL_LOGO_SRC,
  LOADING_VEIL_MESH_BLEND_MODE,
  loadingVeilShouldShowDetails,
} from './ProjectLoadingVeil';
import {
  RESHADERS_MESH_FLOW_MONO,
  LOADING_VEIL_FRAGMENT_SHADER,
} from './ReshadersMeshFlowLayer';

describe('ProjectLoadingVeil', () => {
  it('uses an untinted blurred 90% grayscale backdrop', () => {
    expect(LOADING_VEIL_BACKDROP).toEqual({
      blurPx: 34,
      grayscale: 0.9,
    });
  });

  it('composites the ReShaders Mesh Flow shader with Hard Light', () => {
    expect(LOADING_VEIL_MESH_BLEND_MODE).toBe('hard-light');
    expect(RESHADERS_MESH_FLOW_MONO.speed).toBeGreaterThan(0);
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('meshFlow');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('u_warp');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('u_softness');
    expect(LOADING_VEIL_FRAGMENT_SHADER).toContain('u_grain');
  });

  it('uses the monochrome wordmark within the light mark', () => {
    expect(LOADING_VEIL_LOGO_SRC).toBe('/field-brand/monochrome/logo-light-trans.png');
  });

  it('keeps routine loading visually quiet and reveals only actionable detail', () => {
    expect(loadingVeilShouldShowDetails()).toBe(false);
    expect(loadingVeilShouldShowDetails(undefined, false)).toBe(false);
    expect(loadingVeilShouldShowDetails('Canvas is taking longer to start')).toBe(true);
    expect(loadingVeilShouldShowDetails(undefined, true)).toBe(true);
  });
});
