import { describe, expect, it } from 'vitest';
import {
  LOADING_VEIL_BACKDROP,
  LOADING_VEIL_LOGO_SRC,
  LOADING_VEIL_MESH_BLEND_MODE,
  loadingVeilShouldShowDetails,
} from './ProjectLoadingVeil';
import {
  FIELD_LOADING_MESH,
  REVYME_MESH_FRAGMENT_SHADER,
} from './RevymeMeshGradientLayer';

describe('ProjectLoadingVeil', () => {
  it('uses an untinted blurred 90% grayscale backdrop', () => {
    expect(LOADING_VEIL_BACKDROP).toEqual({
      blurPx: 34,
      grayscale: 0.9,
    });
  });

  it('composites the native animated mesh with Hard Light', () => {
    expect(LOADING_VEIL_MESH_BLEND_MODE).toBe('hard-light');
    expect(FIELD_LOADING_MESH.speed).toBeGreaterThan(0);
    expect(REVYME_MESH_FRAGMENT_SHADER).toContain('getPosition');
    expect(REVYME_MESH_FRAGMENT_SHADER).toContain('u_distortion');
    expect(REVYME_MESH_FRAGMENT_SHADER).toContain('u_swirl');
    expect(REVYME_MESH_FRAGMENT_SHADER).toContain('u_grainOverlay');
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
