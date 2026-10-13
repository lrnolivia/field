import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import {
  galleryEdgeScrollDelta,
  galleryTargetItemAtPoint,
  resolveGalleryDragIdentity,
} from './GalleryDragStrategy';

function node(
  id: string,
  type: string,
  parentId: string | null,
  children: string[] = [],
  styles: Record<string, string> = {},
  name = '',
): CanvasNode {
  return {
    id,
    type,
    parentId,
    children,
    styles,
    attrs: {},
    name,
    textContent: '',
    hasMixedContent: false,
  } as CanvasNode;
}

function galleryNodes(): Map<string, CanvasNode> {
  return new Map([
    ['gallery', node('gallery', 'div', null, ['item-a', 'item-b'], {
      '--field-gallery-view': 'grid',
    }, 'Gallery')],
    ['item-a', node('item-a', 'figure', 'gallery', ['image-a', 'next-a'], {
      '--field-gallery-item': '1',
    }, 'Gallery Item')],
    ['image-a', node('image-a', 'img', 'item-a', [], {}, 'Gallery Image')],
    ['next-a', node('next-a', 'button', 'item-a', [], {}, 'Gallery Next')],
    ['item-b', node('item-b', 'figure', 'gallery', ['image-b'], {
      '--field-gallery-item': '1',
    }, 'Gallery Item')],
    ['image-b', node('image-b', 'img', 'item-b', [], {}, 'Gallery Image')],
  ]);
}

describe('GalleryDragStrategy helpers', () => {
  it('resolves a Gallery image to its stable item/root identity', () => {
    expect(resolveGalleryDragIdentity(galleryNodes(), 'image-a')).toEqual({
      galleryId: 'gallery',
      itemId: 'item-a',
      imageId: 'image-a',
    });
  });

  it('accepts the item itself but rejects generated Carousel controls', () => {
    expect(resolveGalleryDragIdentity(galleryNodes(), 'item-a')).toEqual({
      galleryId: 'gallery',
      itemId: 'item-a',
      imageId: 'image-a',
    });
    expect(resolveGalleryDragIdentity(galleryNodes(), 'next-a')).toBeNull();
  });

  it('targets the image slot under the pointer and never self-targets', () => {
    const rects = [
      { id: 'item-a', rect: { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 } },
      { id: 'item-b', rect: { left: 110, top: 0, right: 210, bottom: 100, width: 100, height: 100 } },
    ];
    expect(galleryTargetItemAtPoint(rects, 'item-a', { x: 160, y: 50 })).toBe('item-b');
    expect(galleryTargetItemAtPoint(rects, 'item-a', { x: 40, y: 50 })).toBeNull();
  });

  it('edge-scrolls only Strip/Carousel, with signed left/right deltas', () => {
    const rect = { left: 100, top: 100, right: 500, bottom: 300, width: 400, height: 200 };
    expect(galleryEdgeScrollDelta('grid', rect, { x: 105, y: 200 })).toBe(0);
    expect(galleryEdgeScrollDelta('natural', rect, { x: 495, y: 200 })).toBe(0);
    expect(galleryEdgeScrollDelta('story', rect, { x: 105, y: 200 })).toBe(0);
    expect(galleryEdgeScrollDelta('strip', rect, { x: 105, y: 200 })).toBeLessThan(0);
    expect(galleryEdgeScrollDelta('carousel', rect, { x: 495, y: 200 })).toBeGreaterThan(0);
    expect(galleryEdgeScrollDelta('carousel', rect, { x: 495, y: 350 })).toBe(0);
  });
});
