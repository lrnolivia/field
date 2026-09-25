import { describe, expect, it } from 'vitest';
import {
  galleryAriaLabel,
  GALLERY_ITEM_STYLE_PROPERTY,
  GALLERY_VIEW_STYLE_PROPERTY,
  getGalleryDefaultImageFit,
  getGalleryImagePatch,
  getGalleryItemPatch,
  getGalleryRootPatch,
  getGalleryStripHoverPatch,
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
    expect(root.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect(root.gap).toBe('24px');
    expect(root.maxWidth).toBe('1240px');
    expect(getGalleryItemPatch('grid', 0)).toMatchObject({ [GALLERY_ITEM_STYLE_PROPERTY]: '1', aspectRatio: '1 / 1', borderRadius: '12px' });
  });

  it('maps the current Terra Prime Natural four-item mosaic deterministically', () => {
    expect(getGalleryRootPatch('natural')).toMatchObject({
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: '4px',
    });
    expect(getGalleryItemPatch('natural', 0)).toMatchObject({ gridColumn: '1 / span 2', gridRow: '1 / span 2' });
    expect(getGalleryItemPatch('natural', 1)).toMatchObject({ gridColumn: '3', gridRow: '1' });
    expect(getGalleryItemPatch('natural', 2)).toMatchObject({ gridColumn: '3', gridRow: '2' });
    expect(getGalleryItemPatch('natural', 3)).toMatchObject({ gridColumn: '4', gridRow: '1 / span 2' });
    expect(getGalleryItemPatch('natural', 4)).toMatchObject({ gridColumn: '1 / span 2', gridRow: '3 / span 2' });
  });

  it('captures Strip hover behavior as real source-backed CSS semantics', () => {
    expect(getGalleryRootPatch('strip')).toMatchObject({ gap: '4px', overflowX: 'hidden' });
    expect(getGalleryItemPatch('strip', 0)).toMatchObject({ width: '120px', height: '620px' });
    expect(getGalleryStripHoverPatch()).toEqual({ width: '380px' });
  });

  it('matches Story frame rhythm while preserving per-image overrides', () => {
    expect(getGalleryRootPatch('story')).toMatchObject({ gap: '54px', maxWidth: '1240px' });
    expect(getGalleryItemPatch('story', 0).aspectRatio).toBe('2 / 1');
    expect(getGalleryItemPatch('story', 1).aspectRatio).toBe('31 / 18');
    expect(getGalleryDefaultImageFit('story')).toBe('cover');
    expect(getGalleryImagePatch('story')).not.toHaveProperty('objectFit');
    expect(getGalleryImagePatch('story')).not.toHaveProperty('objectPosition');
  });
});
