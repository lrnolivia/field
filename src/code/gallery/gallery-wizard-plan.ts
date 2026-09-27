import {
  GALLERY_FRAME_SIZING_STYLE_PROPERTY,
  normalizeGallerySourceRatio,
  type GalleryFrameSizing,
} from './gallery-frame-sizing';
import {
  buildGalleryItemNode,
  galleryRootAttrs,
  type GallerySourceNode,
} from './gallery-model';
import {
  GALLERY_NATURAL_SEED_STYLE_PROPERTY,
  getGalleryRootPatch,
  getGalleryStripHoverPatch,
  normalizeGalleryNaturalSeed,
  type GalleryViewId,
} from './gallery-views';

export interface GalleryWizardSourcePlanInput {
  mediaUrls: readonly string[];
  view: GalleryViewId;
  frameSizing: GalleryFrameSizing;
  fit: 'cover' | 'contain';
  naturalSeed: number;
  sourceRatios?: readonly (number | null | undefined)[];
  ariaLabel?: string;
}

export interface GalleryWizardSourcePlan {
  rootPatch: Record<string, string>;
  rootAttrs: Record<string, string>;
  itemNodes: GallerySourceNode[];
  naturalSeed: number;
  stripHoverPatch: Record<string, string> | null;
  carousel: boolean;
}

export function buildGalleryWizardSourcePlan(input: GalleryWizardSourcePlanInput): GalleryWizardSourcePlan {
  if (input.mediaUrls.length === 0) {
    throw new Error('Gallery wizard requires at least one media item.');
  }

  const naturalSeed = input.view === 'natural'
    ? normalizeGalleryNaturalSeed(input.naturalSeed)
    : 0;
  const rootPatch = {
    ...getGalleryRootPatch(input.view),
    [GALLERY_FRAME_SIZING_STYLE_PROPERTY]: input.frameSizing,
    [GALLERY_NATURAL_SEED_STYLE_PROPERTY]: String(naturalSeed),
    minHeight: '',
  };
  const rootAttrs: Record<string, string> = {
    ...galleryRootAttrs(input.view, input.ariaLabel),
    'aria-roledescription': input.view === 'carousel' ? 'carousel' : '',
  };

  const itemNodes = input.mediaUrls.map((url, index) => {
    const rawRatio = input.sourceRatios?.[index] ?? null;
    if (input.frameSizing === 'source' && rawRatio === null) {
      throw new Error('Source-ratio Gallery wizard plan requires intrinsic media ratios.');
    }
    const ratio = input.frameSizing === 'source'
      ? normalizeGallerySourceRatio(rawRatio)
      : null;
    const item = buildGalleryItemNode(
      url,
      index,
      input.view,
      '',
      naturalSeed,
      input.frameSizing,
      ratio,
    );
    const image = item.children?.find((child) => child.type.replace(/^motion\./, '') === 'img');
    if (!image) throw new Error('Gallery item is missing its source image node.');
    image.styles = { ...image.styles, objectFit: input.fit };
    return item;
  });

  return {
    rootPatch,
    rootAttrs,
    itemNodes,
    naturalSeed,
    stripHoverPatch: input.view === 'strip' ? getGalleryStripHoverPatch(input.frameSizing) : null,
    carousel: input.view === 'carousel',
  };
}
