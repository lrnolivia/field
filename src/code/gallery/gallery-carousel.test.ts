import { describe, expect, it } from 'vitest';
import {
  GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY,
  GALLERY_VIEWS,
  getGalleryCarouselControlPatch,
  getGalleryImagePatch,
  getGalleryItemPatch,
  getGalleryRootPatch,
} from './gallery-views';
import { buildGalleryCarouselControlNodes, galleryCarouselSlideDomId } from './gallery-model';

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
      styles: { [GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY]: 'counter' },
    });
    expect(controls[2]).toMatchObject({
      type: 'a',
      textContent: '›',
      attrs: { href: `#${galleryCarouselSlideDomId('item b')}`, 'aria-label': 'Next image' },
      styles: { [GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY]: 'next' },
    });
  });

  it('sanitizes source node IDs into stable fragment-safe slide IDs', () => {
    expect(galleryCarouselSlideDomId('gallery:item/42')).toBe('field-gallery-slide-gallery-item-42');
  });
});
