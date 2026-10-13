import type { ToolbarItem } from '@/canvas/drag/toolbar-item-config';
import { buildGalleryItemNode, galleryRootAttrs, type GallerySourceNode } from '@/code/gallery/gallery-model';
import { getGalleryRootPatch } from '@/code/gallery/gallery-views';
import type { NewNodeDescriptor } from '@/shared/types';
import { deriveUploadKey } from '@/editor/left-toolbar/panels/media-gallery-utils';

export interface GalleryMediaAsset {
  url: string;
  key?: string;
  sourceRatio?: number | null;
}

export type GalleryMediaToolbarAsset = string | GalleryMediaAsset;

/**
 * Resolve the user's Media-panel selection against the visible upload order.
 * Set insertion order is intentionally ignored: Gallery order should match what
 * the user is looking at in Media, even if they shift-clicked bottom-to-top.
 */
export function selectedGalleryMediaUrls(
  assets: readonly GalleryMediaAsset[],
  selectedKeys: ReadonlySet<string>,
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const asset of assets) {
    const key = deriveUploadKey(asset);
    const url = asset.url.trim();
    if (!key || !selectedKeys.has(key) || !url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

function sourceNodeToDescriptor(node: GallerySourceNode): NewNodeDescriptor {
  return {
    tag: node.type,
    id: node.id,
    name: node.name,
    styles: { ...node.styles },
    attrs: node.attrs ? { ...node.attrs } : undefined,
    textContent: node.textContent,
    children: node.children?.map(sourceNodeToDescriptor),
  };
}

/**
 * Compose a normal toolbar item from canonical Gallery source builders. The
 * drop coordinator owns placement/source mutation exactly as it does for an
 * Insert-panel Gallery; this helper only supplies the pre-populated descriptor.
 */
export function buildGalleryMediaToolbarItem(assets: readonly GalleryMediaToolbarAsset[]): ToolbarItem {
  const seen = new Set<string>();
  const media = assets.flatMap((asset) => {
    const entry = typeof asset === 'string' ? { url: asset } : asset;
    const url = entry.url.trim();
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ url, sourceRatio: entry.sourceRatio ?? null }];
  });
  return {
    id: 'media-selection-gallery',
    elementType: 'div',
    name: 'Gallery',
    // No empty-Gallery minHeight here: this Gallery already has real children.
    defaultStyles: getGalleryRootPatch('grid'),
    defaultAttrs: galleryRootAttrs('grid'),
    children: () => media.map((asset, index) => sourceNodeToDescriptor(
      buildGalleryItemNode(asset.url, index, 'grid'),
    )),
    ghostSize: { width: 360, height: 220 },
    galleryMedia: media,
  };
}
