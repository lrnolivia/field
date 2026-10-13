import { describe, expect, it } from 'vitest';
import {
  GALLERY_IMAGE_ROTATION_STYLE_PROPERTY,
  GALLERY_IMAGE_TRANSFORM_VALUE,
  GALLERY_IMAGE_ZOOM_STYLE_PROPERTY,
} from './gallery-media-treatment';
import { buildGalleryReplacementPlan, galleryReplacementNeedsSourceRatio } from './gallery-replacement-plan';

const treatment = {
  objectFit: 'contain',
  objectPosition: '23% 71%',
  transformOrigin: '23% 71%',
  [GALLERY_IMAGE_ZOOM_STYLE_PROPERTY]: '1.4',
  [GALLERY_IMAGE_ROTATION_STYLE_PROPERTY]: '12deg',
  transform: GALLERY_IMAGE_TRANSFORM_VALUE,
};

describe('Gallery replacement plan', () => {
  it('replaces only src in Composed mode when no intrinsic ratio identity exists', () => {
    const plan = buildGalleryReplacementPlan({
      src: '/new.jpg',
      view: 'grid',
      index: 0,
      naturalSeed: 0,
      frameSizing: 'composed',
      currentSourceRatio: '',
      measuredSourceRatio: null,
    });

    expect(plan.imageAttrs).toEqual({ src: '/new.jpg' });
    expect(plan.itemPatch).toEqual({});
    expect(plan.imagePatch).toEqual({});
    expect({ ...treatment, ...plan.imagePatch }).toEqual(treatment);
  });

  it('refreshes Source-ratio frame geometry without touching authored media treatment', () => {
    const plan = buildGalleryReplacementPlan({
      src: '/wide.jpg',
      view: 'story',
      index: 1,
      naturalSeed: 0,
      frameSizing: 'source',
      currentSourceRatio: '0.75',
      measuredSourceRatio: 1.5,
    });

    expect(plan.itemPatch).toMatchObject({
      '--field-gallery-source-ratio': '1.5',
      aspectRatio: '1.5 / 1',
    });
    expect(plan.imagePatch).toEqual({});
    expect({ ...treatment, ...plan.imagePatch }).toEqual(treatment);
  });

  it('updates only Carousel frame-owned image geometry under Source ratio', () => {
    const plan = buildGalleryReplacementPlan({
      src: '/portrait.jpg',
      view: 'carousel',
      index: 0,
      naturalSeed: 0,
      frameSizing: 'source',
      currentSourceRatio: '1',
      measuredSourceRatio: 0.5,
    });
    const nextStyles = { ...treatment, ...plan.imagePatch };

    expect(plan.imagePatch).toEqual({
      width: 'min(360px, calc(100% - 32px))',
      height: 'auto',
      aspectRatio: '0.5 / 1',
    });
    expect(nextStyles).toMatchObject(treatment);
    expect(nextStyles.objectFit).toBe('contain');
    expect(nextStyles.objectPosition).toBe('23% 71%');
    expect(nextStyles[GALLERY_IMAGE_ZOOM_STYLE_PROPERTY]).toBe('1.4');
    expect(nextStyles[GALLERY_IMAGE_ROTATION_STYLE_PROPERTY]).toBe('12deg');
  });

  it('keeps historical intrinsic-ratio metadata fresh even after switching back to Composed', () => {
    expect(galleryReplacementNeedsSourceRatio('composed', '1.25')).toBe(true);
    const plan = buildGalleryReplacementPlan({
      src: '/new.jpg',
      view: 'grid',
      index: 0,
      naturalSeed: 0,
      frameSizing: 'composed',
      currentSourceRatio: '1.25',
      measuredSourceRatio: 2,
    });

    expect(plan.itemPatch).toEqual({ '--field-gallery-source-ratio': '2' });
    expect(plan.imagePatch).toEqual({});
  });
});
