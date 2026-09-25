import { buildGalleryItemNode, type GallerySourceNode } from '@/code/gallery/gallery-model';
import type { GalleryViewId } from '@/code/gallery/gallery-views';

export interface GalleryContentOperationItem {
  itemId: string;
  imageId: string;
  src: string;
  alt: string;
  objectFit: string;
  objectPosition: string;
}

/** Return the adjacent real Gallery item for a precise one-step reorder. */
export function galleryAdjacentItemId(
  items: readonly Pick<GalleryContentOperationItem, 'itemId'>[],
  itemId: string,
  delta: -1 | 1,
): string | null {
  const index = items.findIndex((item) => item.itemId === itemId);
  if (index < 0) return null;
  const target = items[index + delta];
  return target?.itemId ?? null;
}

/**
 * Duplicate one Gallery content item without inventing a shadow content model.
 *
 * `buildGalleryItemNode` supplies fresh source IDs and the current view's real
 * figure/image geometry; then this helper carries forward the selected image's
 * authored content/presentation state. Responsive overrides are cloned by the
 * caller through field's existing container-override mutation path.
 */
export function buildGalleryDuplicateItemNode(
  item: GalleryContentOperationItem,
  insertIndex: number,
  view: GalleryViewId,
): GallerySourceNode {
  const duplicate = buildGalleryItemNode(item.src, insertIndex, view, item.alt);
  const image = duplicate.children?.find((child) => child.type.replace(/^motion\./, '') === 'img');
  if (image) {
    image.styles = {
      ...image.styles,
      objectFit: item.objectFit || 'cover',
      objectPosition: item.objectPosition || '50% 50%',
    };
  }
  return duplicate;
}
