import { useCallback, useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useControl } from '../controls/ControlProvider';
import { ToolDivider } from '../controls';
import ImageSearchModal from '../ui/ImageSearchModal';
import GalleryCropOverlay from '../gallery/GalleryCropOverlay';
import GalleryContentSection, { type GalleryContentItem } from '../gallery/GalleryContentSection';
import GalleryViewSection from '../gallery/GalleryViewSection';
import GalleryImageSection from '../gallery/GalleryImageSection';
import { useNodesComputed } from '@/code/stores/node-family';
import {
  buildGalleryItemNode,
  getGalleryItems,
  getGalleryView,
  isGalleryNode,
} from '@/code/gallery/gallery-model';
import {
  GALLERY_VIEWS,
  galleryAriaLabel,
  getGalleryImagePatch,
  getGalleryItemPatch,
  getGalleryRootPatch,
  getGalleryStripHoverPatch,
  type GalleryViewId,
} from '@/code/gallery/gallery-views';
import { queueMutation, queueMutations, flushNow, type Mutation } from '@/code/mutation/mutation-queue';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { getViewportPrefix } from '@/canvas/node-ops';
import { trace } from '@/shared/debug-trace';
import { containerOverridesAtom, getOverridesAtWidth, type ContainerOverrideMap } from '@/code/stores/container-query-store';

function styleMutation(nodeId: string, styles: Record<string, string>, isReplica: boolean, vpWidth: number): Mutation {
  return isReplica && vpWidth > 0
    ? { type: 'updateContainerStyle', nodeId, maxWidth: vpWidth, styles }
    : { type: 'updateStyles', nodeId, styles };
}

/**
 * A Gallery view is one global semantic choice, while detail settings may have
 * ordinary field breakpoint overrides. When the semantic view changes, stale
 * layout declarations from the PREVIOUS view must not survive in a replica
 * (e.g. a tablet Grid gap silently overriding Story's 54px rhythm). Clear only
 * the properties owned by the new view patch at widths where they actually
 * exist. Image fit/focal state is not part of those patches and is preserved.
 */
function clearResponsivePatchMutations(
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

/**
 * Outer gate keeps GalleryTool's hook count stable across transient selection /
 * parser changes. PropertiesPanel normally mounts this only for a Gallery, but
 * using the same outer/inner pattern as VideoTool avoids a conditional-hook
 * failure if the selected node disappears for one render during source reparse.
 */
export default function GalleryTool() {
  const { node } = useControl();
  if (!node || !isGalleryNode(node)) return null;
  return <GalleryToolInner />;
}

function GalleryToolInner() {
  const {
    node,
    nodeId,
    styles,
    vpId,
    isReplica,
    vpWidth,
    updateStyle,
  } = useControl();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [cropImageId, setCropImageId] = useState<string | null>(null);
  const responsiveOverrides = useAtomValue(containerOverridesAtom);

  const items = useNodesComputed((nodes) => {
    const gallery = nodeId ? nodes.get(nodeId) : undefined;
    if (!gallery || !isGalleryNode(gallery)) return [];
    return getGalleryItems(gallery, nodes).map(({ item, image }): GalleryContentItem => ({
      itemId: item.id,
      imageId: image.id,
      src: image.attrs?.src ?? '',
      alt: image.attrs?.alt ?? '',
      objectFit: image.styles?.objectFit ?? 'cover',
      objectPosition: image.styles?.objectPosition ?? '50% 50%',
    }));
  }, [nodeId]);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedItemId(null);
      setCropImageId(null);
      return;
    }
    if (!selectedItemId || !items.some((item) => item.itemId === selectedItemId)) {
      setSelectedItemId(items[0].itemId);
    }
  }, [items, selectedItemId]);

  // The outer gate guarantees these for the lifetime of this inner component.
  const gallery = node!;
  const galleryId = nodeId!;
  const currentView = getGalleryView(gallery);
  const selectedItem = items.find((item) => item.itemId === selectedItemId) ?? null;
  const prefix = getViewportPrefix(vpId);
  const bridge = getCanvasBridge();

  const patchAndQueue = useCallback((targetId: string, patch: Record<string, string>, responsive = true) => {
    bridge.patchStyles(targetId, prefix, patch);
    queueMutation(styleMutation(targetId, patch, responsive && isReplica, responsive ? vpWidth : 0));
  }, [bridge, isReplica, prefix, vpWidth]);

  const applyView = useCallback((view: GalleryViewId) => {
    const descriptor = GALLERY_VIEWS.find((entry) => entry.id === view);
    if (!descriptor || descriptor.status !== 'available') return;

    const mutations: Mutation[] = [];
    const rootPatch = getGalleryRootPatch(view);
    bridge.patchStyles(galleryId, prefix, rootPatch);
    // View identity is global semantic state and rides inside rootPatch as the
    // parsed `--field-gallery-view` custom property. View-specific settings may
    // remain responsive, but semantic switching never creates a second hidden
    // per-breakpoint Gallery document.
    mutations.push({ type: 'updateStyles', nodeId: galleryId, styles: rootPatch });
    mutations.push(...clearResponsivePatchMutations(galleryId, rootPatch, responsiveOverrides));
    const accessibleLabel = galleryAriaLabel(view);
    bridge.setAttribute(galleryId, prefix, 'aria-label', accessibleLabel);
    // Also migrates first-draft `Gallery — View` source back to a normal
    // accessible name now that view identity lives in the custom property.
    mutations.push({ type: 'updateHtmlAttrs', nodeId: galleryId, attrs: { 'aria-label': accessibleLabel } });

    items.forEach((item, index) => {
      const itemPatch = getGalleryItemPatch(view, index);
      const imagePatch = getGalleryImagePatch(view);
      bridge.patchStyles(item.itemId, prefix, itemPatch);
      bridge.patchStyles(item.imageId, prefix, imagePatch);
      mutations.push({ type: 'updateStyles', nodeId: item.itemId, styles: itemPatch });
      mutations.push(...clearResponsivePatchMutations(item.itemId, itemPatch, responsiveOverrides));
      mutations.push({ type: 'updateStyles', nodeId: item.imageId, styles: imagePatch });
      mutations.push(...clearResponsivePatchMutations(item.imageId, imagePatch, responsiveOverrides));
      // Terra Prime Strip is not a fake static row: its narrow 120px frames
      // expand to 380px on hover in the real website. Use field's existing
      // source-backed :hover mutation so Preview and production get the same
      // interaction. Switching away removes the Gallery-owned hover rule.
      mutations.push(view === 'strip'
        ? { type: 'updateCssHover', nodeId: item.itemId, styles: getGalleryStripHoverPatch() }
        : { type: 'removeCssHover', nodeId: item.itemId });
    });

    queueMutations(mutations);
    flushNow();
    trace.action('gallery:view-change', { nodeId: galleryId, view, items: items.length });
  }, [bridge, galleryId, items, prefix, responsiveOverrides]);

  const addMedia = useCallback((urls: string[]) => {
    // De-dupe only this picker result. Reusing the same canonical project asset
    // in a later Gallery position is valid content and must not require upload.
    const unique = urls.filter((url, index) => url && urls.indexOf(url) === index);
    if (unique.length === 0) return;

    const mutations: Mutation[] = [];
    unique.forEach((url, offset) => {
      const sourceNode = buildGalleryItemNode(url, items.length + offset, currentView);
      mutations.push({ type: 'addNode', parentId: galleryId, node: sourceNode });
      if (currentView === 'strip') {
        mutations.push({ type: 'updateCssHover', nodeId: sourceNode.id, styles: getGalleryStripHoverPatch() });
      }
    });
    queueMutations(mutations);
    flushNow();
    trace.action('gallery:add-media', { nodeId: galleryId, count: unique.length });
  }, [currentView, galleryId, items.length]);

  const removeItem = useCallback((itemId: string) => {
    const remaining = items.filter((item) => item.itemId !== itemId);
    // Imperative-first: the item disappears and the surviving geometry settles
    // immediately; source mutation below makes that visual result permanent.
    bridge.removeElement?.(itemId);
    remaining.forEach((item, index) => {
      bridge.patchStyles(item.itemId, prefix, getGalleryItemPatch(currentView, index));
    });
    queueMutations([
      // Remove Gallery-owned pseudo state while the source element still exists.
      { type: 'removeCssHover', nodeId: itemId },
      { type: 'removeNode', nodeId: itemId },
      ...remaining.map((item, index) => ({
        type: 'updateStyles' as const,
        nodeId: item.itemId,
        styles: getGalleryItemPatch(currentView, index),
      })),
    ]);
    flushNow();
    if (selectedItemId === itemId) setSelectedItemId(null);
    trace.action('gallery:remove-media', { nodeId: galleryId, itemId });
  }, [bridge, currentView, galleryId, items, prefix, selectedItemId]);

  const reorderItem = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    const from = items.findIndex((item) => item.itemId === fromId);
    const to = items.findIndex((item) => item.itemId === toId);
    if (from < 0 || to < 0) return;

    const ordered = [...items];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);

    // Same imperative-first pattern as canvas drag/drop: reorder the real
    // iframe element now, then commit source child order. Recompute each item's
    // view geometry against the NEW order so Natural/Story patterns follow it.
    bridge.reparentLive?.(fromId, prefix, galleryId, to, {});
    ordered.forEach((item, index) => {
      bridge.patchStyles(item.itemId, prefix, getGalleryItemPatch(currentView, index));
    });

    const mutations: Mutation[] = [
      { type: 'reorder', nodeId: fromId, parentId: galleryId, index: to },
      ...ordered.map((item, index) => ({
        type: 'updateStyles' as const,
        nodeId: item.itemId,
        styles: getGalleryItemPatch(currentView, index),
      })),
    ];

    queueMutations(mutations);
    flushNow();
    trace.action('gallery:reorder', { nodeId: galleryId, from, to });
  }, [bridge, currentView, galleryId, items, prefix]);

  const updateAlt = useCallback((value: string) => {
    if (!selectedItem) return;
    queueMutation({ type: 'updateHtmlAttrs', nodeId: selectedItem.imageId, attrs: { alt: value } });
    bridge.setAttribute(selectedItem.imageId, prefix, 'alt', value);
  }, [bridge, prefix, selectedItem]);

  const updateImageStyle = useCallback((key: string, value: string) => {
    if (!selectedItem) return;
    patchAndQueue(selectedItem.imageId, { [key]: value }, true);
  }, [patchAndQueue, selectedItem]);

  const resetCrop = useCallback(() => {
    if (!selectedItem) return;
    updateImageStyle('objectPosition', '50% 50%');
  }, [selectedItem, updateImageStyle]);

  const updateAllItemStyles = useCallback((patch: Record<string, string>) => {
    const mutations = items.map((item) => styleMutation(item.itemId, patch, isReplica, vpWidth));
    items.forEach((item) => bridge.patchStyles(item.itemId, prefix, patch));
    queueMutations(mutations);
    flushNow();
  }, [bridge, isReplica, items, prefix, vpWidth]);

  // Child image/item controls are not wrapped in their own ControlProvider, so
  // resolve their active replica values from the SAME @media/@container map the
  // rest of field uses. This keeps per-image fit/focal position and strip height
  // breakpoint-aware without inventing a Gallery-specific responsive store.
  const selectedImageOverrides = selectedItem && isReplica && vpWidth > 0
    ? getOverridesAtWidth(responsiveOverrides, selectedItem.imageId, vpWidth)
    : null;
  const selectedItemOverrides = selectedItem && isReplica && vpWidth > 0
    ? getOverridesAtWidth(responsiveOverrides, selectedItem.itemId, vpWidth)
    : null;

  const effectiveCropPosition = selectedItem
    ? selectedImageOverrides?.get('objectPosition')
      || bridge.getComputedValue(selectedItem.imageId, prefix, 'objectPosition')
      || selectedItem.objectPosition
    : '50% 50%';
  const effectiveFit = selectedItem
    ? selectedImageOverrides?.get('objectFit')
      || bridge.getComputedValue(selectedItem.imageId, prefix, 'objectFit')
      || selectedItem.objectFit
      || 'cover'
    : 'cover';
  const stripHeight = selectedItem
    ? selectedItemOverrides?.get('height')
      || bridge.getComputedValue(selectedItem.itemId, prefix, 'height')
      || '620px'
    : '620px';

  return (
    <>
      <GalleryContentSection
        items={items}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        onAddMedia={() => setPickerOpen(true)}
        onRemoveItem={removeItem}
        onReorder={reorderItem}
      />

      <ToolDivider />

      <GalleryViewSection
        currentView={currentView}
        styles={styles}
        stripHeight={stripHeight}
        onViewChange={applyView}
        onRootStyleChange={updateStyle}
        onAllItemStyleChange={updateAllItemStyles}
      />

      {selectedItem && (
        <>
          <ToolDivider />
          <GalleryImageSection
          alt={selectedItem.alt}
          fit={effectiveFit}
          objectPosition={effectiveCropPosition}
          onAltChange={updateAlt}
          onFitChange={(value) => updateImageStyle('objectFit', value)}
          onReposition={() => setCropImageId(selectedItem.imageId)}
          onResetPosition={resetCrop}
          />
        </>
      )}

      <ImageSearchModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectionMode="multiple"
        onSelect={() => {}}
        onSelectMany={addMedia}
      />

      {selectedItem && cropImageId === selectedItem.imageId && (
        <GalleryCropOverlay
          imageId={selectedItem.imageId}
          src={selectedItem.src}
          vpId={vpId}
          objectPosition={effectiveCropPosition}
          onCommit={(value) => updateImageStyle('objectPosition', value)}
          onClose={() => setCropImageId(null)}
        />
      )}
    </>
  );
}
