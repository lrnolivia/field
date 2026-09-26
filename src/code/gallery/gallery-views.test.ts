import { describe, expect, it } from 'vitest';
import {
  galleryAriaLabel,
  GALLERY_ITEM_STYLE_PROPERTY,
  GALLERY_NATURAL_SEED_STYLE_PROPERTY,
  GALLERY_VIEW_STYLE_PROPERTY,
  NATURAL_COMPOSITION_COUNT,
  getGalleryDefaultImageFit,
  getGalleryImagePatch,
  getGalleryIndexGeometryPatch,
  getGalleryItemPatch,
  getGalleryRootPatch,
  getGalleryStripHoverPatch,
  nextGalleryNaturalSeed,
  normalizeGalleryNaturalSeed,
  parseGalleryAriaLabel,
} from './gallery-views';

describe('Gallery view registry', () => {
  it('keeps accessibility naming separate from source-backed view metadata', () => {
    expect(galleryAriaLabel('natural')).toBe('Gallery');
    expect(getGalleryRootPatch('natural')[GALLERY_VIEW_STYLE_PROPERTY]).toBe('natural');
    // First-draft source remains readable for migration.
    expect(parseGalleryAriaLabel('Gallery — Natural')).toBe('natural');
    expect(parseGalleryAriaLabel('Portfolio gallery')).toBeNull();
  });

  it('matches the current Terra Prime Grid composition defaults', () => {
    const root = getGalleryRootPatch('grid');
    expect(root.gridTemplateColumns).toBe('repeat(auto-fit, minmax(min(100%, 360px), 1fr))');
    expect(root.gap).toBe('24px');
    expect(root.maxWidth).toBe('1240px');
    expect(getGalleryItemPatch('grid', 0)).toMatchObject({ [GALLERY_ITEM_STYLE_PROPERTY]: '1', aspectRatio: '1 / 1', borderRadius: '12px' });
  });

  it('maps the current Terra Prime Natural four-item mosaic deterministically', () => {
    expect(getGalleryRootPatch('natural')).toMatchObject({
      gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))',
      overflowX: 'auto',
      overscrollBehaviorX: 'contain',
      gap: '4px',
    });
    expect(getGalleryItemPatch('natural', 0)).toMatchObject({ gridColumn: '1 / span 2', gridRow: '1 / span 2' });
    expect(getGalleryItemPatch('natural', 1)).toMatchObject({ gridColumn: '3', gridRow: '1' });
    expect(getGalleryItemPatch('natural', 2)).toMatchObject({ gridColumn: '3', gridRow: '2' });
    expect(getGalleryItemPatch('natural', 3)).toMatchObject({ gridColumn: '4', gridRow: '1 / span 2' });
    expect(getGalleryItemPatch('natural', 4)).toMatchObject({ gridColumn: '1 / span 2', gridRow: '3 / span 2' });
    expect(getGalleryIndexGeometryPatch('natural', 2)).toEqual({ gridColumn: '3', gridRow: '2', aspectRatio: '1 / 1' });
  });

  it('shuffles Natural deterministically without changing semantic content order', () => {
    const mediaOrder = ['a', 'b', 'c', 'd'];
    const defaultGeometry = mediaOrder.map((_, index) => getGalleryIndexGeometryPatch('natural', index, 0));
    const nextSeed = nextGalleryNaturalSeed(0);
    const shuffledGeometry = mediaOrder.map((_, index) => getGalleryIndexGeometryPatch('natural', index, nextSeed));

    expect(nextSeed).toBe(1);
    expect(shuffledGeometry).not.toEqual(defaultGeometry);
    expect(mediaOrder).toEqual(['a', 'b', 'c', 'd']);
    expect(getGalleryIndexGeometryPatch('natural', 0, nextSeed)).toEqual(shuffledGeometry[0]);
    expect(new Set(shuffledGeometry.map((geometry) => geometry.gridColumn + '|' + geometry.gridRow)).size).toBe(4);
    expect(normalizeGalleryNaturalSeed(-1)).toBe(NATURAL_COMPOSITION_COUNT - 1);
    expect(nextGalleryNaturalSeed(NATURAL_COMPOSITION_COUNT - 1)).toBe(0);
    expect(GALLERY_NATURAL_SEED_STYLE_PROPERTY).toBe('--field-gallery-natural-seed');
  });

  it('keeps Strip source-backed while making narrow runtimes reachable', () => {
    expect(getGalleryRootPatch('strip')).toMatchObject({
      gap: '4px',
      overflowX: 'auto',
      scrollSnapType: 'x proximity',
      overscrollBehaviorX: 'contain',
    });
    expect(getGalleryItemPatch('strip', 0)).toMatchObject({ width: '120px', height: '620px', scrollSnapAlign: 'start' });
    expect(getGalleryStripHoverPatch()).toEqual({ width: 'min(380px, calc(100vw - 32px))' });
  });

  it('preserves Carousel desktop intent while making its stage and image fluid', () => {
    expect(getGalleryItemPatch('carousel', 0)).toMatchObject({
      height: '',
      gridTemplateRows: 'clamp(520px, calc(100vw - 48px), 820px) 38px',
      gridTemplateColumns: 'minmax(16px, 1fr) 38px 22px auto 22px 38px minmax(16px, 1fr)',
    });
    expect(getGalleryImagePatch('carousel')).toMatchObject({
      width: 'min(520px, calc(100% - 32px))',
      height: 'auto',
      aspectRatio: '13 / 18',
    });
    expect(getGalleryImagePatch('grid').aspectRatio).toBe('');
  });

  it('matches Story frame rhythm while preserving per-image overrides', () => {
    expect(getGalleryRootPatch('story')).toMatchObject({ gap: '54px', maxWidth: '1240px' });
    expect(getGalleryItemPatch('story', 0).aspectRatio).toBe('2 / 1');
    expect(getGalleryItemPatch('story', 1).aspectRatio).toBe('31 / 18');
    expect(getGalleryIndexGeometryPatch('story', 0)).toEqual({ aspectRatio: '2 / 1' });
    expect(getGalleryIndexGeometryPatch('grid', 0)).toEqual({});
    expect(getGalleryDefaultImageFit('story')).toBe('cover');
    expect(getGalleryImagePatch('story')).not.toHaveProperty('objectFit');
    expect(getGalleryImagePatch('story')).not.toHaveProperty('objectPosition');
  });
});
