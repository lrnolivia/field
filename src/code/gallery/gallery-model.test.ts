import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import { buildGalleryItemNode, galleryItemUrls, getGalleryItems, getGalleryView, isGalleryNode } from './gallery-model';
import { GALLERY_VIEW_STYLE_PROPERTY } from './gallery-views';

function node(partial: Partial<CanvasNode> & Pick<CanvasNode, 'id'>): CanvasNode {
  const { id, ...rest } = partial;
  return { id, type: 'div', name: 'div', parentId: null, children: [], styles: {}, attrs: {}, textContent: '', hasMixedContent: false, order: 0, ...rest } as CanvasNode;
}

describe('Gallery semantic model', () => {
  it('detects explicit source-backed Gallery view metadata independently of labels', () => {
    const gallery = node({
      id: 'g',
      name: 'Renamed by user',
      attrs: { role: 'region', 'aria-label': 'Photography' },
      styles: { [GALLERY_VIEW_STYLE_PROPERTY]: 'strip' },
    });
    expect(isGalleryNode(gallery)).toBe(true);
    expect(getGalleryView(gallery)).toBe('strip');
  });

  it('still reads first-draft Gallery ARIA metadata for migration', () => {
    const gallery = node({ id: 'g', name: 'Gallery', attrs: { role: 'region', 'aria-label': 'Gallery — Story' } });
    expect(isGalleryNode(gallery)).toBe(true);
    expect(getGalleryView(gallery)).toBe('story');
  });


  it('builds real figure/img source nodes with first-class media metadata', () => {
    const item = buildGalleryItemNode('/photo.jpg', 0, 'grid', 'A portrait');
    expect(item.type).toBe('figure');
    expect(item.name).toBe('Gallery Item');
    expect(item.children).toHaveLength(1);
    expect(item.children?.[0]).toMatchObject({
      type: 'img',
      name: 'Gallery Image',
      attrs: { src: '/photo.jpg', alt: 'A portrait' },
      styles: { objectFit: 'cover', objectPosition: '50% 50%' },
    });
  });

  it('derives media identity from the real image children rather than a shadow list', () => {
    const gallery = node({ id: 'g', name: 'Gallery', attrs: { role: 'region', 'aria-label': 'Gallery — Grid' }, children: ['a', 'b'] });
    const a = node({ id: 'a', type: 'figure', name: 'Gallery Item', parentId: 'g', children: ['ai'] });
    const b = node({ id: 'b', type: 'figure', name: 'Gallery Item', parentId: 'g', children: ['bi'] });
    const ai = node({ id: 'ai', type: 'img', name: 'Gallery Image', parentId: 'a', attrs: { src: '/same.jpg', alt: '' } });
    const bi = node({ id: 'bi', type: 'img', name: 'Gallery Image', parentId: 'b', attrs: { src: '/same.jpg', alt: '' } });
    const nodes = new Map([[gallery.id, gallery], [a.id, a], [b.id, b], [ai.id, ai], [bi.id, bi]]);
    const items = getGalleryItems(gallery, nodes);
    expect(items).toHaveLength(2);
    expect([...galleryItemUrls(items)]).toEqual(['/same.jpg']);
  });
  it('uses source child order as Gallery order', () => {
    const gallery = node({ id: 'g', name: 'Gallery', attrs: { role: 'region', 'aria-label': 'Gallery — Grid' }, children: ['b', 'a'] });
    const b = node({ id: 'b', type: 'figure', name: 'Gallery Item', parentId: 'g', children: ['bi'] });
    const a = node({ id: 'a', type: 'figure', name: 'Gallery Item', parentId: 'g', children: ['ai'] });
    const bi = node({ id: 'bi', type: 'img', name: 'Gallery Image', parentId: 'b', attrs: { src: '/b.jpg', alt: '' } });
    const ai = node({ id: 'ai', type: 'img', name: 'Gallery Image', parentId: 'a', attrs: { src: '/a.jpg', alt: '' } });
    const nodes = new Map([[gallery.id, gallery], [b.id, b], [a.id, a], [bi.id, bi], [ai.id, ai]]);
    expect(getGalleryItems(gallery, nodes).map(({ image }) => image.attrs.src)).toEqual(['/b.jpg', '/a.jpg']);
  });
});
