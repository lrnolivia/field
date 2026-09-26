import { describe, expect, it } from 'vitest';
import { buildGalleryDuplicateItemNode, galleryAdjacentItemId, type GalleryContentOperationItem } from './content-operations';

const item: GalleryContentOperationItem = {
  itemId: 'item-original',
  imageId: 'image-original',
  src: '/media/portrait.jpg',
  alt: 'Portrait at dusk',
  objectFit: 'contain',
  objectPosition: '23% 71%',
  zoom: '1.4',
  rotation: '12deg',
};

describe('Gallery content operations', () => {
  it('duplicates real source content with fresh IDs while preserving image presentation', () => {
    const duplicate = buildGalleryDuplicateItemNode(item, 1, 'story');
    const image = duplicate.children?.[0];

    expect(duplicate.type).toBe('figure');
    expect(duplicate.id).not.toBe(item.itemId);
    expect(image?.id).not.toBe(item.imageId);
    expect(image?.attrs).toMatchObject({ src: item.src, alt: item.alt });
    expect(image?.styles).toMatchObject({
      objectFit: 'contain',
      objectPosition: '23% 71%',
      transformOrigin: '23% 71%',
      '--field-gallery-zoom': '1.4',
      '--field-gallery-rotation': '12deg',
      transform: 'scale(var(--field-gallery-zoom, 1)) rotate(var(--field-gallery-rotation, 0deg))',
    });
  });

  it('duplicates into the active Natural composition rather than stale default geometry', () => {
    const duplicate = buildGalleryDuplicateItemNode(item, 1, 'natural', 2);
    expect(duplicate.styles).toMatchObject({
      gridColumn: '4',
      gridRow: '1 / span 2',
      aspectRatio: '1 / 2',
    });
  });

  it('resolves one-step reorder targets and hard-stops at list boundaries', () => {
    const items = [{ itemId: 'a' }, { itemId: 'b' }, { itemId: 'c' }];
    expect(galleryAdjacentItemId(items, 'b', -1)).toBe('a');
    expect(galleryAdjacentItemId(items, 'b', 1)).toBe('c');
    expect(galleryAdjacentItemId(items, 'a', -1)).toBeNull();
    expect(galleryAdjacentItemId(items, 'c', 1)).toBeNull();
    expect(galleryAdjacentItemId(items, 'missing', 1)).toBeNull();
  });
});
