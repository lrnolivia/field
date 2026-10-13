import type { Mutation } from '@/code/mutation/mutation-queue';
import type { ContainerOverrideMap } from '@/code/stores/container-query-store';
import {
  buildGalleryCarouselControlNodes,
  galleryCarouselSlideAttrs,
  galleryCarouselSlideDomId,
  galleryCarouselSlideResetAttrs,
} from './gallery-model';

export interface GalleryCarouselSyncItem {
  itemId: string;
  controlIds: readonly string[];
  domId?: string;
  ariaLabel?: string;
}

export function removeGalleryCarouselControlMutations(items: readonly GalleryCarouselSyncItem[]): Mutation[] {
  return items.flatMap((item) =>
    item.controlIds.map((controlId) => ({ type: 'removeNode' as const, nodeId: controlId })),
  );
}

export function clearGalleryCarouselSlideMutations(items: readonly GalleryCarouselSyncItem[]): Mutation[] {
  return items.map((item) => ({
    type: 'updateHtmlAttrs' as const,
    nodeId: item.itemId,
    attrs: galleryCarouselSlideResetAttrs(item.ariaLabel),
  }));
}

export function buildGalleryCarouselSyncMutations(items: readonly GalleryCarouselSyncItem[]): Mutation[] {
  const itemIds = items.map((item) => item.itemId);
  const slideDomIds = items.map((item) => item.domId?.trim() || galleryCarouselSlideDomId(item.itemId));
  return [
    ...removeGalleryCarouselControlMutations(items),
    ...items.map((item, index) => ({
      type: 'updateHtmlAttrs' as const,
      nodeId: item.itemId,
      attrs: galleryCarouselSlideAttrs(item.itemId, index, itemIds.length, slideDomIds[index], item.ariaLabel),
    })),
    ...items.flatMap((item, index) =>
      buildGalleryCarouselControlNodes(itemIds, index, slideDomIds).map((node) => ({
        type: 'addNode' as const,
        parentId: item.itemId,
        node,
      })),
    ),
  ];
}

export function cloneResponsiveOverrideMutations(
  sourceId: string,
  targetId: string,
  overrides: ContainerOverrideMap,
  excludedProperties: readonly string[] = [],
): Mutation[] {
  const byWidth = overrides.get(sourceId);
  if (!byWidth) return [];
  const mutations: Mutation[] = [];
  const excluded = new Set(excludedProperties);
  for (const [maxWidth, properties] of byWidth) {
    const styles = Object.fromEntries([...properties].filter(([key]) => !excluded.has(key)));
    if (Object.keys(styles).length > 0) {
      mutations.push({ type: 'updateContainerStyle', nodeId: targetId, maxWidth, styles });
    }
  }
  return mutations;
}

export function clearResponsivePatchMutations(
  nodeId: string,
  patch: Record<string, string>,
  overrides: ContainerOverrideMap,
): Mutation[] {
  const byWidth = overrides.get(nodeId);
  if (!byWidth) return [];
  const ownedKeys = Object.keys(patch);
  const mutations: Mutation[] = [];
  for (const [maxWidth, properties] of byWidth) {
    const clear: Record<string, string> = {};
    for (const key of ownedKeys) {
      if (properties.has(key)) clear[key] = '';
    }
    if (Object.keys(clear).length > 0) {
      mutations.push({ type: 'updateContainerStyle', nodeId, maxWidth, styles: clear });
    }
  }
  return mutations;
}
