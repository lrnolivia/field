import { describe, expect, it } from 'vitest';
import {
  GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY,
  GALLERY_VIEWS,
  getGalleryCarouselControlPatch,
  getGalleryImagePatch,
  getGalleryItemPatch,
  getGalleryRootPatch,
} from './gallery-views';
import {
  buildGalleryCarouselControlNodes,
  galleryCarouselCounterDomId,
  galleryCarouselSlideAttrs,
  galleryCarouselSlideDomId,
  galleryCarouselSlideResetAttrs,
  galleryRootAttrs,
} from './gallery-model';

describe('Gallery runtime carousel', () => {
  it('promotes Carousel to an available native runtime view', () => {
    const carousel = GALLERY_VIEWS.find((view) => view.id === 'carousel');
    expect(carousel?.status).toBe('available');
    expect(getGalleryRootPatch('carousel')).toMatchObject({
      display: 'flex',
      overflowX: 'auto',
      scrollSnapType: 'x mandatory',
      scrollBehavior: 'smooth',
      maxWidth: '1240px',
    });
  });

  it('matches the Terra Prime stage, image, and control geometry', () => {
    expect(getGalleryItemPatch('carousel', 0)).toMatchObject({
      flex: '0 0 100%',
      width: '100%',
      height: '',
      gridTemplateRows: 'clamp(520px, calc(100vw - 48px), 820px) 38px',
      rowGap: '16px',
      scrollSnapAlign: 'center',
    });
    expect(getGalleryImagePatch('carousel')).toMatchObject({
      width: 'min(520px, calc(100% - 32px))',
      height: 'auto',
      aspectRatio: '13 / 18',
      borderRadius: '12px',
      gridRow: '1',
      gridColumn: '1 / -1',
    });
    expect(getGalleryCarouselControlPatch('previous')).toMatchObject({ width: '38px', height: '38px', borderRadius: '19px', gridColumn: '2' });
    expect(getGalleryCarouselControlPatch('counter')).toMatchObject({ gridColumn: '4', fontSize: '11px' });
    expect(getGalleryCarouselControlPatch('next')).toMatchObject({ width: '38px', height: '38px', borderRadius: '19px', gridColumn: '6' });
  });

  it('builds wraparound previous/next anchors and a source-derived counter', () => {
    const ids = ['item:a', 'item b', 'item-c'];
    const controls = buildGalleryCarouselControlNodes(ids, 0);
    expect(controls).toHaveLength(3);
    expect(controls[0]).toMatchObject({
      type: 'a',
      textContent: '‹',
      attrs: { href: `#${galleryCarouselSlideDomId('item-c')}`, 'aria-label': 'Previous image' },
      styles: { [GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY]: 'previous' },
    });
    expect(controls[1]).toMatchObject({
      type: 'span',
      textContent: '1 / 3',
      attrs: { id: galleryCarouselCounterDomId('item:a'), 'aria-label': 'Image 1 of 3' },
      styles: { [GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY]: 'counter' },
    });
    expect(controls[2]).toMatchObject({
      type: 'a',
      textContent: '›',
      attrs: { href: `#${galleryCarouselSlideDomId('item b')}`, 'aria-label': 'Next image' },
      styles: { [GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY]: 'next' },
    });
  });

  it('emits source-backed accessible carousel and slide semantics', () => {
    expect(galleryRootAttrs('carousel')).toEqual({
      role: 'region',
      'aria-label': 'Gallery',
      'aria-roledescription': 'carousel',
    });
    expect(galleryRootAttrs('grid')).toEqual({
      role: 'region',
      'aria-label': 'Gallery',
    });
    expect(galleryCarouselSlideAttrs('gallery:item/42', 1, 3)).toEqual({
      id: 'field-gallery-slide-gallery-item-42',
      role: 'group',
      'aria-roledescription': 'slide',
      'aria-describedby': 'field-gallery-counter-gallery-item-42',
      'aria-label': '',
    });
    expect(galleryCarouselSlideResetAttrs()).toEqual({
      role: '',
      'aria-roledescription': '',
      'aria-describedby': '',
      'aria-label': '',
    });
  });

  it('preserves authored labels and DOM ids while Carousel adds its own semantics', () => {
    expect(galleryRootAttrs('carousel', 'Photography')).toEqual({
      role: 'region',
      'aria-label': 'Photography',
      'aria-roledescription': 'carousel',
    });
    expect(galleryRootAttrs('grid', 'Gallery — Story')).toEqual({ role: 'region', 'aria-label': 'Gallery' });
    expect(galleryCarouselSlideAttrs('gallery:item/42', 1, 3, 'portfolio-shot', 'Portrait at dusk')).toMatchObject({
      id: 'portfolio-shot',
      'aria-label': 'Portrait at dusk',
      'aria-describedby': 'field-gallery-counter-gallery-item-42',
    });
    expect(galleryCarouselSlideResetAttrs('2 of 3')['aria-label']).toBe('');
    expect(galleryCarouselSlideResetAttrs('Portrait at dusk')['aria-label']).toBe('Portrait at dusk');
  });

  it('removes dead controls from one-image carousels and supports authored fragment targets', () => {
    expect(buildGalleryCarouselControlNodes(['only'], 0)).toEqual([]);
    expect(galleryCarouselSlideAttrs('only', 0, 1)['aria-describedby']).toBe('');
    const controls = buildGalleryCarouselControlNodes(['a', 'b'], 0, ['authored-a', 'authored-b']);
    expect(controls[0].attrs?.href).toBe('#authored-b');
    expect(controls[2].attrs?.href).toBe('#authored-b');
  });

  it('sanitizes source node IDs into stable fragment-safe slide IDs', () => {
    expect(galleryCarouselSlideDomId('gallery:item/42')).toBe('field-gallery-slide-gallery-item-42');
  });
});
