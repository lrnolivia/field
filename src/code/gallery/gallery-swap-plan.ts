import type { Mutation } from '@/code/mutation/mutation-queue';
import type { ContainerOverrideMap } from '@/code/stores/container-query-store';
import { normalizeGallerySourceRatio, type GalleryFrameSizing } from './gallery-frame-sizing';
import {
  getGalleryIndexGeometryPatch,
  getGalleryItemPatch,
  type GalleryViewId,
} from './gallery-views';
import {
  buildGalleryCarouselSyncMutations,
  clearResponsivePatchMutations,
  type GalleryCarouselSyncItem,
} from './gallery-mutations';

export interface GallerySwapItem extends GalleryCarouselSyncItem {
  sourceRatio?: string | number | null;
}

export interface GallerySwapPlanInput {
  galleryId: string;
  items: readonly GallerySwapItem[];
  draggedItemId: string;
  targetItemId: string;
  view: GalleryViewId;
  naturalSeed: number;
  frameSizing: GalleryFrameSizing;
  responsiveOverrides: ContainerOverrideMap;
}

export interface GallerySwapPlan {
  ordered: GallerySwapItem[];
  mutations: Mutation[];
  fromIndex: number;
  toIndex: number;
}

export function swapGalleryItemOrder(
  items: readonly GallerySwapItem[],
  draggedItemId: string,
  targetItemId: string,
): { ordered: GallerySwapItem[]; fromIndex: number; toIndex: number } | null {
  if (draggedItemId === targetItemId) return null;
  const fromIndex = items.findIndex((item) => item.itemId === draggedItemId);
  const toIndex = items.findIndex((item) => item.itemId === targetItemId);
  if (fromIndex < 0 || toIndex < 0) return null;

  const ordered = [...items];
  [ordered[fromIndex], ordered[toIndex]] = [ordered[toIndex], ordered[fromIndex]];
  return { ordered, fromIndex, toIndex };
}

function sourceOrderMutations(
  galleryId: string,
  currentIds: readonly string[],
  desiredIds: readonly string[],
): Mutation[] {
  const current = [...currentIds];
  const mutations: Mutation[] = [];
  for (let index = 0; index < desiredIds.length; index++) {
    const desired = desiredIds[index];
    if (current[index] === desired) continue;
    const currentIndex = current.indexOf(desired);
    if (currentIndex < 0) continue;
    current.splice(currentIndex, 1);
    current.splice(index, 0, desired);
    mutations.push({
      type: 'reorder',
      nodeId: desired,
      parentId: galleryId,
      index,
    });
  }
  return mutations;
}

export function buildGallerySwapPlan(input: GallerySwapPlanInput): GallerySwapPlan | null {
  const swapped = swapGalleryItemOrder(input.items, input.draggedItemId, input.targetItemId);
  if (!swapped) return null;

  const { ordered, fromIndex, toIndex } = swapped;
  const mutations: Mutation[] = [
    ...sourceOrderMutations(
      input.galleryId,
      input.items.map((item) => item.itemId),
      ordered.map((item) => item.itemId),
    ),
    ...ordered.map((item, index) => ({
      type: 'updateStyles' as const,
      nodeId: item.itemId,
      styles: getGalleryItemPatch(
        input.view,
        index,
        input.naturalSeed,
        input.frameSizing,
        normalizeGallerySourceRatio(item.sourceRatio),
      ),
    })),
    ...ordered.flatMap((item, index) =>
      clearResponsivePatchMutations(
        item.itemId,
        getGalleryIndexGeometryPatch(
          input.view,
          index,
          input.naturalSeed,
          input.frameSizing,
          normalizeGallerySourceRatio(item.sourceRatio),
        ),
        input.responsiveOverrides,
      ),
    ),
  ];

  if (input.view === 'carousel') {
    mutations.push(...buildGalleryCarouselSyncMutations(ordered));
  }

  return { ordered, mutations, fromIndex, toIndex };
}
