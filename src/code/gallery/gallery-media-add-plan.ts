import type { CanvasNode } from '@/code/parsing/parser';
import type { Mutation } from '@/code/mutation/mutation-queue';
import {
  GALLERY_FRAME_SIZING_STYLE_PROPERTY,
  normalizeGalleryFrameSizing,
  normalizeGallerySourceRatio,
  type GalleryFrameSizing,
} from './gallery-frame-sizing';
import {
  buildGalleryItemNode,
  getGalleryCarouselControls,
  getGalleryItems,
  getGalleryView,
  type GallerySourceNode,
} from './gallery-model';
import {
  buildGalleryCarouselSyncMutations,
  type GalleryCarouselSyncItem,
} from './gallery-mutations';
import {
  GALLERY_NATURAL_SEED_STYLE_PROPERTY,
  getGalleryStripHoverPatch,
  normalizeGalleryNaturalSeed,
  type GalleryViewId,
} from './gallery-views';

export interface GalleryMediaAddAsset {
  url: string;
  sourceRatio?: number | null;
}

export interface GalleryMediaAddPlan {
  mutations: Mutation[];
  itemNodes: GallerySourceNode[];
  view: GalleryViewId;
  frameSizing: GalleryFrameSizing;
  missingSourceRatios: number;
}

export function buildGalleryMediaAddPlan(input: {
  gallery: CanvasNode;
  nodes: Map<string, CanvasNode>;
  media: readonly GalleryMediaAddAsset[];
}): GalleryMediaAddPlan {
  const seen = new Set<string>();
  const media = input.media.filter((asset) => {
    const url = asset.url.trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  const view = getGalleryView(input.gallery);
  const frameSizing = normalizeGalleryFrameSizing(
    input.gallery.styles?.[GALLERY_FRAME_SIZING_STYLE_PROPERTY],
  );
  const naturalSeed = normalizeGalleryNaturalSeed(
    input.gallery.styles?.[GALLERY_NATURAL_SEED_STYLE_PROPERTY],
  );
  const existing = getGalleryItems(input.gallery, input.nodes);
  const missingSourceRatios = frameSizing === 'source'
    ? media.filter((asset) => asset.sourceRatio == null).length
    : 0;

  const itemNodes = media.map((asset, offset) => buildGalleryItemNode(
    asset.url.trim(),
    existing.length + offset,
    view,
    '',
    naturalSeed,
    frameSizing,
    frameSizing === 'source' ? normalizeGallerySourceRatio(asset.sourceRatio) : null,
  ));

  const mutations: Mutation[] = [];
  itemNodes.forEach((sourceNode) => {
    mutations.push({ type: 'addNode', parentId: input.gallery.id, node: sourceNode });
    if (view === 'strip') {
      mutations.push({
        type: 'updateCssHover',
        nodeId: sourceNode.id,
        styles: getGalleryStripHoverPatch(frameSizing),
      });
    }
  });

  if (view === 'carousel') {
    const nextItems: GalleryCarouselSyncItem[] = [
      ...existing.map(({ item }) => {
        const controls = getGalleryCarouselControls(item, input.nodes);
        return {
          itemId: item.id,
          controlIds: [controls.previous?.id, controls.counter?.id, controls.next?.id]
            .filter((id): id is string => !!id),
          domId: item.attrs?.id,
          ariaLabel: item.attrs?.['aria-label'],
        };
      }),
      ...itemNodes.map((item) => ({
        itemId: item.id,
        controlIds: [],
        domId: item.attrs?.id,
        ariaLabel: item.attrs?.['aria-label'],
      })),
    ];
    mutations.push(...buildGalleryCarouselSyncMutations(nextItems));
  }

  return { mutations, itemNodes, view, frameSizing, missingSourceRatios };
}
