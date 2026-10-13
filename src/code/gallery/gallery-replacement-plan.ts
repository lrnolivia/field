import {
  GALLERY_SOURCE_RATIO_STYLE_PROPERTY,
  gallerySourceRatioPatch,
  normalizeGallerySourceRatio,
  parseGallerySourceRatio,
  type GalleryFrameSizing,
} from './gallery-frame-sizing';
import {
  getGalleryFrameSizingImagePatch,
  getGalleryFrameSizingItemPatch,
  type GalleryViewId,
} from './gallery-views';

export interface GalleryReplacementPlanInput {
  src: string;
  view: GalleryViewId;
  index: number;
  naturalSeed: number;
  frameSizing: GalleryFrameSizing;
  currentSourceRatio: string | number | null | undefined;
  measuredSourceRatio: number | null;
}

export interface GalleryReplacementPlan {
  imageAttrs: { src: string };
  itemPatch: Record<string, string>;
  imagePatch: Record<string, string>;
  refreshesSourceRatio: boolean;
}

export function galleryReplacementNeedsSourceRatio(
  frameSizing: GalleryFrameSizing,
  currentSourceRatio: string | number | null | undefined,
): boolean {
  return frameSizing === 'source' || parseGallerySourceRatio(currentSourceRatio) !== null;
}

export function buildGalleryReplacementPlan(input: GalleryReplacementPlanInput): GalleryReplacementPlan {
  if (!input.src) throw new Error('Gallery replacement requires a media URL.');

  const refreshesSourceRatio = galleryReplacementNeedsSourceRatio(
    input.frameSizing,
    input.currentSourceRatio,
  );
  if (!refreshesSourceRatio) {
    return {
      imageAttrs: { src: input.src },
      itemPatch: {},
      imagePatch: {},
      refreshesSourceRatio: false,
    };
  }

  const ratio = input.frameSizing === 'source'
    ? normalizeGallerySourceRatio(input.measuredSourceRatio)
    : parseGallerySourceRatio(input.measuredSourceRatio);
  const ratioPatch = ratio === null
    ? { [GALLERY_SOURCE_RATIO_STYLE_PROPERTY]: '' }
    : gallerySourceRatioPatch(ratio);

  const framePatch = input.frameSizing === 'source'
    ? getGalleryFrameSizingItemPatch(
        input.view,
        input.index,
        input.naturalSeed,
        input.frameSizing,
        ratio ?? 1,
      )
    : {};

  const imagePatch = input.frameSizing === 'source'
    ? getGalleryFrameSizingImagePatch(input.view, input.frameSizing, ratio ?? 1)
    : {};

  return {
    imageAttrs: { src: input.src },
    itemPatch: { ...framePatch, ...ratioPatch },
    imagePatch,
    refreshesSourceRatio: true,
  };
}
