import type { CanvasNode } from '@/code/parsing/parser';
import {
  GALLERY_FRAME_SIZING_STYLE_PROPERTY,
  GALLERY_SOURCE_RATIO_STYLE_PROPERTY,
  normalizeGalleryFrameSizing,
} from '@/code/gallery/gallery-frame-sizing';
import {
  getGalleryCarouselControls,
  getGalleryItems,
  getGalleryView,
  isGalleryItemNode,
  isGalleryNode,
} from '@/code/gallery/gallery-model';
import { buildGallerySwapPlan, type GallerySwapItem } from '@/code/gallery/gallery-swap-plan';
import {
  GALLERY_NATURAL_SEED_STYLE_PROPERTY,
  normalizeGalleryNaturalSeed,
  type GalleryViewId,
} from '@/code/gallery/gallery-views';
import { queueMutations, flushNow } from '@/code/mutation/mutation-queue';
import { containerOverridesAtom } from '@/code/stores/container-query-store';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { vpIdFromPrefix } from '@/canvas/node-ops';
import type { PostMessageBridge } from '@/canvas-sandbox/bridge-host';
import { parentHighlightOps } from '@/canvas/selection/parent-highlight-store';
import { getDefaultStore } from 'jotai';
import { trace } from '@/shared/debug-trace';
import type { PendingUpdate, Point } from '@/shared/types';
import { repositionSignalOps } from '../reposition-signal';
import type { DragContext, DragMoveResult, DragStrategy } from '../types';

interface GalleryRectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface GalleryDragIdentity {
  galleryId: string;
  itemId: string;
  imageId: string;
}

function isGalleryImageNode(node: CanvasNode | null | undefined): boolean {
  if (!node) return false;
  return node.name === 'Gallery Image'
    || node.type === 'img'
    || node.type === 'motion.img'
    || node.type === 'Image';
}

export function resolveGalleryDragIdentity(
  nodes: Map<string, CanvasNode>,
  draggedNodeId: string,
): GalleryDragIdentity | null {
  const dragged = nodes.get(draggedNodeId);
  if (!dragged) return null;

  let item: CanvasNode | undefined;
  let image: CanvasNode | undefined;

  if (isGalleryItemNode(dragged)) {
    item = dragged;
    image = (dragged.children ?? [])
      .map((id) => nodes.get(id))
      .find((child): child is CanvasNode => isGalleryImageNode(child));
  } else if (isGalleryImageNode(dragged) && dragged.parentId) {
    const parent = nodes.get(dragged.parentId);
    if (isGalleryItemNode(parent)) {
      item = parent;
      image = dragged;
    }
  }

  if (!item || !image || !item.parentId) return null;
  const gallery = nodes.get(item.parentId);
  if (!gallery || !isGalleryNode(gallery)) return null;
  return { galleryId: gallery.id, itemId: item.id, imageId: image.id };
}

export function galleryTargetItemAtPoint(
  rects: readonly { id: string; rect: GalleryRectLike }[],
  draggedItemId: string,
  point: Point,
): string | null {
  for (const { id, rect } of rects) {
    if (id === draggedItemId) continue;
    if (point.x >= rect.left && point.x <= rect.right
      && point.y >= rect.top && point.y <= rect.bottom) {
      return id;
    }
  }
  return null;
}

export function galleryEdgeScrollDelta(
  view: GalleryViewId,
  galleryRect: GalleryRectLike | null,
  point: Point,
): number {
  if ((view !== 'strip' && view !== 'carousel') || !galleryRect) return 0;
  if (point.y < galleryRect.top || point.y > galleryRect.bottom) return 0;
  const zone = Math.max(28, Math.min(64, galleryRect.width * 0.18));
  if (point.x < galleryRect.left + zone) {
    const strength = Math.min(1, Math.max(0, (galleryRect.left + zone - point.x) / zone));
    return -Math.round(8 + strength * 22);
  }
  if (point.x > galleryRect.right - zone) {
    const strength = Math.min(1, Math.max(0, (point.x - (galleryRect.right - zone)) / zone));
    return Math.round(8 + strength * 22);
  }
  return 0;
}

export class GalleryDragStrategy implements DragStrategy {
  readonly name = 'gallery';

  private galleryId = '';
  private draggedItemId = '';
  private draggedImageId = '';
  private targetItemId: string | null = null;
  private vpPrefix = '';
  private view: GalleryViewId = 'grid';
  private startMouse: Point = { x: 0, y: 0 };
  private swapItems: GallerySwapItem[] = [];
  private naturalSeed = 0;
  private frameSizing = normalizeGalleryFrameSizing(undefined);

  canHandle(context: DragContext): boolean {
    if (context.draggedNodes.length !== 1) return false;
    return resolveGalleryDragIdentity(context.nodes, context.draggedNodes[0].id) !== null;
  }

  onStart(context: DragContext): void {
    this.resetState();
    const dragged = context.draggedNodes[0];
    const identity = dragged ? resolveGalleryDragIdentity(context.nodes, dragged.id) : null;
    if (!identity) return;

    const gallery = context.nodes.get(identity.galleryId);
    if (!gallery) return;

    this.galleryId = identity.galleryId;
    this.draggedItemId = identity.itemId;
    this.draggedImageId = identity.imageId;
    this.vpPrefix = context.viewportPrefix;
    this.view = getGalleryView(gallery);
    this.startMouse = { ...context.startMouse };
    this.naturalSeed = normalizeGalleryNaturalSeed(gallery.styles?.[GALLERY_NATURAL_SEED_STYLE_PROPERTY]);
    this.frameSizing = normalizeGalleryFrameSizing(gallery.styles?.[GALLERY_FRAME_SIZING_STYLE_PROPERTY]);

    this.swapItems = getGalleryItems(gallery, context.nodes).map(({ item }) => {
      const controls = getGalleryCarouselControls(item, context.nodes);
      return {
        itemId: item.id,
        controlIds: [controls.previous?.id, controls.counter?.id, controls.next?.id]
          .filter((id): id is string => !!id),
        domId: item.attrs?.id,
        ariaLabel: item.attrs?.['aria-label'],
        sourceRatio: item.styles?.[GALLERY_SOURCE_RATIO_STYLE_PROPERTY],
      };
    });

    const bridge = getCanvasBridge();
    bridge.previewPatchStyles?.(this.draggedItemId, this.vpPrefix, {
      position: 'relative',
      zIndex: '2147483000',
      pointerEvents: 'none',
      opacity: '0.86',
      transition: 'none',
      willChange: 'translate',
      translate: '0px 0px',
    });
    parentHighlightOps.show({ parentId: this.galleryId, vpId: vpIdFromPrefix(this.vpPrefix) });

    trace.action('gallery-drag:start', {
      galleryId: this.galleryId,
      itemId: this.draggedItemId,
      imageId: this.draggedImageId,
      view: this.view,
      itemCount: this.swapItems.length,
    });
  }

  onMove(context: DragContext, mouseScreen: Point): DragMoveResult {
    if (!this.galleryId || !this.draggedItemId) return this.emptyMove();

    const bridge = getCanvasBridge();
    const scale = context.transform.scale || 1;
    const dx = (mouseScreen.x - this.startMouse.x) / scale;
    const dy = (mouseScreen.y - this.startMouse.y) / scale;
    bridge.previewPatchStyles?.(this.draggedItemId, this.vpPrefix, {
      translate: `${dx}px ${dy}px`,
    });

    const galleryRect = bridge.getRect(this.galleryId, this.vpPrefix);
    const scrollDelta = galleryEdgeScrollDelta(this.view, galleryRect, mouseScreen);
    if (scrollDelta !== 0) {
      bridge.scrollElementBy?.(this.galleryId, this.vpPrefix, scrollDelta, 0);
      if ('prefetchChildRects' in bridge) {
        (bridge as PostMessageBridge).prefetchChildRects(this.galleryId, this.vpPrefix);
      }
    }

    const childRects = bridge.getChildRects(this.galleryId, this.vpPrefix);
    const nextTarget = galleryTargetItemAtPoint(childRects, this.draggedItemId, mouseScreen);
    this.setTarget(nextTarget);

    return {
      snap: null,
      dropTarget: null,
      highlightParentId: this.galleryId,
      highlightVpId: vpIdFromPrefix(this.vpPrefix),
      axisLock: null,
    };
  }

  onEnd(_context: DragContext): PendingUpdate[] {
    const targetItemId = this.targetItemId;
    const draggedItemId = this.draggedItemId;
    const galleryId = this.galleryId;
    const bridge = getCanvasBridge();

    if (!galleryId || !draggedItemId || !targetItemId) {
      this.restorePreview();
      this.resetState();
      return [];
    }

    const plan = buildGallerySwapPlan({
      galleryId,
      items: this.swapItems,
      draggedItemId,
      targetItemId,
      view: this.view,
      naturalSeed: this.naturalSeed,
      frameSizing: this.frameSizing,
      responsiveOverrides: getDefaultStore().get(containerOverridesAtom),
    });
    if (!plan) {
      this.restorePreview();
      this.resetState();
      return [];
    }

    repositionSignalOps.signal();

    if ('swapTwoElements' in bridge) {
      (bridge as PostMessageBridge).swapTwoElements(
        draggedItemId,
        targetItemId,
        galleryId,
        this.vpPrefix,
      );
    }

    this.restorePreview();
    queueMutations(plan.mutations);
    flushNow();
    bridge.repositionOverlays?.();

    trace.action('gallery-drag:swap-commit', {
      galleryId,
      draggedItemId,
      targetItemId,
      fromIndex: plan.fromIndex,
      toIndex: plan.toIndex,
      view: this.view,
      mutationCount: plan.mutations.length,
    });

    this.resetState();
    return [];
  }

  onCancel(_context: DragContext): void {
    const itemId = this.draggedItemId;
    const galleryId = this.galleryId;
    this.restorePreview();
    trace.action('gallery-drag:cancel', { galleryId, itemId });
    this.resetState();
  }

  private setTarget(nextTarget: string | null): void {
    if (nextTarget === this.targetItemId) return;
    const bridge = getCanvasBridge();
    if (this.targetItemId) {
      bridge.previewRestoreStyles?.(this.targetItemId, this.vpPrefix, {});
    }
    this.targetItemId = nextTarget;
    if (nextTarget) {
      bridge.previewPatchStyles?.(nextTarget, this.vpPrefix, {
        outline: '2px solid currentColor',
        outlineOffset: '-2px',
        opacity: '0.72',
      });
    }
  }

  private restorePreview(): void {
    const bridge = getCanvasBridge();
    if (this.targetItemId) {
      bridge.previewRestoreStyles?.(this.targetItemId, this.vpPrefix, {});
    }
    if (this.draggedItemId) {
      bridge.previewRestoreStyles?.(this.draggedItemId, this.vpPrefix, {});
    }
    parentHighlightOps.hide();
  }

  private emptyMove(): DragMoveResult {
    return {
      snap: null,
      dropTarget: null,
      highlightParentId: null,
      axisLock: null,
    };
  }

  private resetState(): void {
    this.galleryId = '';
    this.draggedItemId = '';
    this.draggedImageId = '';
    this.targetItemId = null;
    this.vpPrefix = '';
    this.view = 'grid';
    this.startMouse = { x: 0, y: 0 };
    this.swapItems = [];
    this.naturalSeed = 0;
    this.frameSizing = normalizeGalleryFrameSizing(undefined);
  }
}
