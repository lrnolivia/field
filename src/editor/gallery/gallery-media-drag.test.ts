import { describe, expect, it } from 'vitest';
import { GALLERY_VIEW_STYLE_PROPERTY } from '@/code/gallery/gallery-views';
import { buildGalleryMediaToolbarItem, selectedGalleryMediaUrls } from './gallery-media-drag';

describe('Gallery Media-panel insertion', () => {
  it('resolves selected assets in visible Media order rather than selection order', () => {
    const assets = [
      { url: 'https://cdn.example.com/site/images/a.webp', key: 'site/images/a.webp' },
      { url: 'https://cdn.example.com/site/images/b.webp', key: 'site/images/b.webp' },
      { url: 'https://cdn.example.com/site/images/c.webp', key: 'site/images/c.webp' },
    ];
    const selected = new Set(['site/images/c.webp', 'site/images/a.webp']);
    expect(selectedGalleryMediaUrls(assets, selected)).toEqual([
      'https://cdn.example.com/site/images/a.webp',
      'https://cdn.example.com/site/images/c.webp',
    ]);
  });

  it('supports freshly uploaded rows whose selection identity is derived from the URL', () => {
    const assets = [{ url: 'https://cdn.example.com/site/images/fresh.webp' }];
    expect(selectedGalleryMediaUrls(assets, new Set(['site/images/fresh.webp'])))
      .toEqual(['https://cdn.example.com/site/images/fresh.webp']);
  });

  it('builds a native Grid Gallery through canonical source descriptors', () => {
    const item = buildGalleryMediaToolbarItem(['/a.jpg', '/b.jpg']);
    expect(item).toMatchObject({
      id: 'media-selection-gallery',
      elementType: 'div',
      name: 'Gallery',
      defaultAttrs: { role: 'region', 'aria-label': 'Gallery' },
      ghostSize: { width: 360, height: 220 },
    });
    expect(item.defaultStyles[GALLERY_VIEW_STYLE_PROPERTY]).toBe('grid');
    expect(item.defaultStyles).not.toHaveProperty('minHeight');

    const children = item.children?.() ?? [];
    expect(children).toHaveLength(2);
    expect(children[0]).toMatchObject({
      tag: 'figure',
      name: 'Gallery Item',
      children: [{
        tag: 'img',
        name: 'Gallery Image',
        attrs: { src: '/a.jpg', alt: '' },
        styles: { objectFit: 'cover', objectPosition: '50% 50%' },
      }],
    });
    expect(children[1].children?.[0].attrs?.src).toBe('/b.jpg');
    expect(children[0].id).not.toBe(children[1].id);
  });
});
