import { describe,expect,it } from 'vitest';
import { LOADING_VEIL_BACKDROP,LOADING_VEIL_LOGO_SRC,LOADING_VEIL_MESH_BLEND_MODE,loadingVeilShouldShowDetails } from './ProjectLoadingVeil';
import { FIGMA_LOADING_FRAME } from './ReshadersMeshFlowLayer';

describe('ProjectLoadingVeil',()=>{
  it('uses the untinted blurred grayscale live backdrop',()=>expect(LOADING_VEIL_BACKDROP).toEqual({blurPx:34,grayscale:0.9}));
  it('uses the authored Figma frame and motion contract',()=>{
    expect(LOADING_VEIL_MESH_BLEND_MODE).toBe('hard-light');
    expect(FIGMA_LOADING_FRAME).toMatchObject({fileKey:'ywgbSYrD0fUcXmREaWjqRw',frameNodeId:'8:2679',componentSetNodeId:'8:3',frameBlendMode:'hard-light',selectedVariant:'Frame 51',variantDurationMs:2000,cycleMs:6000,noiseComponentSetNodeId:'8:48',noiseBlendMode:'soft-light',noiseStepMs:100,noiseTilePx:256});
    expect(FIGMA_LOADING_FRAME.gradientStops).toEqual([[0,'#525252'],[0.1958332061767578,'#3a3a3a'],[0.4510415494441986,'#ffffff'],[0.6489582061767578,'#808080'],[0.8624998927116394,'#7a7a7a']]);
    expect(FIGMA_LOADING_FRAME.noiseAssets).toHaveLength(4);
  });
  it('uses the light monochrome field mark',()=>expect(LOADING_VEIL_LOGO_SRC).toBe('/field-brand/monochrome/logo-light-trans.png'));
  it('keeps routine loading visually quiet',()=>{
    expect(loadingVeilShouldShowDetails()).toBe(false);
    expect(loadingVeilShouldShowDetails('Canvas is taking longer to start')).toBe(true);
    expect(loadingVeilShouldShowDetails(undefined,true)).toBe(true);
  });
});
