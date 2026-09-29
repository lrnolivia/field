// SelectionBox.tsx — Rubber-band (marquee) selection on empty canvas drag.
// Listens for pointerdown on the canvas container (not on nodes).
// Shows a blue semi-transparent rectangle and selects nodes that intersect.

import { useEffect, useRef, useState, useCallback } from 'react';
import { trace } from '@/shared/debug-trace';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { parseRectCacheKey, vpIdFromPrefix, isNodeLockedById, getNodeHitsAtPoint } from '@/canvas/node-ops';
import { isGhostNodeId } from '@/shared/ghost-id';
import { getActiveAutoPan, isSpaceBarDown } from '@/canvas/transform';
import { isViewerMode } from '@/code/stores/viewer-mode-store';
import { getNodesSnapshot } from '@/code/stores/store';

/**
 * Suppress the next SelectionBox activation.
 * Called by iframe hit test path when a node is found — prevents SelectionBox
 * from activating on the same pointerdown event (since in iframe mode,
 * e.target is always the container, not the node element).
 */
let _suppressNextSelectionBox = false;
export function suppressSelectionBox(): void { _suppressNextSelectionBox = true; }

interface SelectionBoxProps {
  containerEl: HTMLElement | null;  // The canvas container (screen-space)
  contentEl: HTMLElement | null;    // The content div with nodes
  /** `vpId` = the viewport the marquee mostly covered (dominant-hit rule) —
   *  the mount point sets it as the interacting viewport so replicas swept
   *  by the marquee behave exactly like replica CLICKS. `viewportsByNode`
   *  feeds the overlay's per-artboard outlines (marqueeViewportSpreadAtom). */
  onSelectionChange: (ids: string[], vpId: string, viewportsByNode: Record<string, string[]>) => void;
  isActive: boolean;  // Only active when tool mode is 'select'
}

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** AABB overlap test between two screen-space rects. */
export function rectsOverlap(a: BoxRect, b: DOMRect): boolean {
  return (
    a.x < b.right &&
    a.x + a.width > b.left &&
    a.y < b.bottom &&
    a.y + a.height > b.top
  );
}

export type MarqueeDepth = 'surface' | 'deep';

export interface MarqueeSelection {
  /** Deduped node ids under the marquee — a node swept in BOTH the primary
   *  viewport and a replica appears ONCE (the selection model stores plain
   *  ids; WHICH viewport lives in `interactingViewportIdAtom`). */
  ids: string[];
  /** The viewport the marquee mostly covered — the caller sets it as the
   *  interacting viewport so the selection overlay/tools land on the same
   *  replica the user swept, mirroring what a replica CLICK does. */
  vpId: string;
  /** EVERY viewport each node was swept in — feeds the selection overlay's
   *  per-artboard outlines (`marqueeViewportSpreadAtom`), so one big sweep
   *  shows selection on desktop + tablet + mobile at once, standard. */
  viewportsByNode: Record<string, string[]>;
}

/** Sorted-ids signature — pairs a viewport-spread map with the exact
 *  selection that produced it (see `marqueeViewportSpreadAtom`). */
export function marqueeSelectionSig(ids: string[]): string {
  return [...ids].sort().join('|');
}

/**
 * All node IDs that intersect the selection rect, across the PRIMARY
 * viewport AND every replica (tablet / mobile) — replicas are first-class
 * marquee targets, same as they're first-class click targets. Reads from
 * the bridge rectCache.
 */
export function getMarqueeSelection(
  _contentEl: HTMLElement,
  selectionRect: BoxRect,
  depth: MarqueeDepth = 'surface',
): MarqueeSelection {
  const bridge = getCanvasBridge();
  if (!('rectCache' in bridge)) return { ids: [], vpId: vpIdFromPrefix(''), viewportsByNode: {} };

  const matched = new Set<string>();
  const hitsPerPrefix = new Map<string, number>();
  const viewportsByNode: Record<string, string[]> = {};
  const cache = (bridge as any).rectCache as Map<string, DOMRect>;
  for (const [key] of cache) {
    const { vpPrefix, nodeId } = parseRectCacheKey(key) ?? { vpPrefix: '', nodeId: key };
    if (!nodeId || nodeId === 'root') continue;

    // Skip ghost elements by ID pattern (__N suffix)
    if (isGhostNodeId(nodeId)) continue;

    // Skip TEMPLATE chrome on templated pages. The template merge prefixes
    // every template node (header / footer / nav + their whole subtrees)
    // with `layout::` and inserts the `children-slot` placeholder — they're
    // locked chrome owned by the template file, not page content. A marquee
    // sweeping the top of the page must not scoop the template header into
    // the selection (same exclusion deleteNode applies). Applies to every
    // viewport — replica template chrome is just as locked.
    if (nodeId.startsWith('layout::') || nodeId === 'children-slot') continue;
    // Locked layers (pointer-events: none on the node or an ancestor) are
    // ignored by the pointer — the marquee included. Same rule as
    // getNodeHitsAtPoint; the layers panel remains the way to select them.
    if (isNodeLockedById(nodeId)) continue;

    const nodeRect = bridge.getRect(nodeId, vpPrefix);
    if (!nodeRect) continue;

    if (rectsOverlap(selectionRect, nodeRect)) {
      matched.add(nodeId);
      hitsPerPrefix.set(vpPrefix, (hitsPerPrefix.get(vpPrefix) ?? 0) + 1);
      const nodeVpId = vpIdFromPrefix(vpPrefix);
      const list = (viewportsByNode[nodeId] ??= []);
      if (!list.includes(nodeVpId)) list.push(nodeVpId);
    }
  }

  // Dominant viewport = the prefix with the most hits; the PRIMARY ('')
  // wins ties so a sweep spanning desktop + a replica stays anchored on
  // the primary (matching where edits are least surprising).
  let dominantPrefix = '';
  let dominantCount = hitsPerPrefix.get('') ?? 0;
  for (const [prefix, count] of hitsPerPrefix) {
    if (count > dominantCount) { dominantPrefix = prefix; dominantCount = count; }
  }

  // NORMAL marquee follows the surface-selection model: when both a parent
  // and one of its children overlap, keep the TOPMOST matched node. Modifier
  // marquee is Figma's documented nested-selection gesture, so it inverts the
  // rule and keeps the DEEPEST matched nodes instead — a child can be selected
  // without also selecting the parent that geometrically contains it.
  //
  // Keeping exactly one level of a matched ancestry chain also protects the
  // existing "all selected nodes are peers" assumptions used by grouping,
  // transforms, and the multi-selection overlay.
  const nodes = getNodesSnapshot();
  const ids = depth === 'deep'
    ? dropMatchedAncestors(matched, nodes)
    : dropMatchedDescendants(matched, nodes);
  for (const id of Object.keys(viewportsByNode)) {
    if (!ids.includes(id)) delete viewportsByNode[id];
  }

  return { ids, vpId: vpIdFromPrefix(dominantPrefix), viewportsByNode };
}

/** Drop every matched id that has another matched id in its ancestor chain.
 *  Pure — unit tested. Unknown ids (not in the map) are kept — dropping a
 *  node we can't place would silently shrink the selection. */
export function dropMatchedDescendants(
  matched: ReadonlySet<string>,
  nodes: ReadonlyMap<string, { parentId?: string | null }>,
): string[] {
  const out: string[] = [];
  for (const id of matched) {
    let parent = nodes.get(id)?.parentId ?? null;
    let isDescendant = false;
    let hops = 0;
    while (parent && hops++ < 200) {
      if (matched.has(parent)) { isDescendant = true; break; }
      parent = nodes.get(parent)?.parentId ?? null;
    }
    if (!isDescendant) out.push(id);
  }
  return out;
}

/** Drop every matched id that has another matched id below it in the same
 * ancestry chain. This is the inverse of `dropMatchedDescendants` and powers
 * Cmd/Ctrl-marquee: nested layers win over their containing parent. Unknown
 * ids remain selectable; ancestry walks are cycle-bounded. */
export function dropMatchedAncestors(
  matched: ReadonlySet<string>,
  nodes: ReadonlyMap<string, { parentId?: string | null }>,
): string[] {
  const matchedAncestors = new Set<string>();
  for (const id of matched) {
    let parent = nodes.get(id)?.parentId ?? null;
    let hops = 0;
    while (parent && hops++ < 200) {
      if (matched.has(parent)) matchedAncestors.add(parent);
      parent = nodes.get(parent)?.parentId ?? null;
    }
  }
  return [...matched].filter(id => !matchedAncestors.has(id));
}

/** Back-compat id-only view of `getMarqueeSelection`. */
export function getIntersectingNodeIds(contentEl: HTMLElement, selectionRect: BoxRect): string[] {
  return getMarqueeSelection(contentEl, selectionRect).ids;
}


export default function SelectionBox({ containerEl, contentEl, onSelectionChange, isActive }: SelectionBoxProps) {
  const [box, setBox] = useState<BoxRect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const marqueeDepthRef = useRef<MarqueeDepth>('surface');
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const contentElRef = useRef(contentEl);
  contentElRef.current = contentEl;
  const autoPanCleanupRef = useRef<(() => void) | null>(null);
  const lastMoveRef = useRef<{ x: number; y: number } | null>(null);

  const stopGesture = useCallback(() => {
    startRef.current = null;
    isDraggingRef.current = false;
    marqueeDepthRef.current = 'surface';
    lastMoveRef.current = null;
    setBox(null);
    autoPanCleanupRef.current?.();
    autoPanCleanupRef.current = null;
  }, []);

  const redraw = useCallback((clientX: number, clientY: number) => {
    if (!startRef.current || !isDraggingRef.current) return;
    const dx = clientX - startRef.current.x;
    const dy = clientY - startRef.current.y;
    const rect: BoxRect = {
      x: Math.min(startRef.current.x, clientX),
      y: Math.min(startRef.current.y, clientY),
      width: Math.abs(dx),
      height: Math.abs(dy),
    };
    setBox(rect);
    const content = contentElRef.current;
    if (!content) return;
    const sel = getMarqueeSelection(content, rect, marqueeDepthRef.current);
    onSelectionChangeRef.current(sel.ids, sel.vpId, sel.viewportsByNode);
  }, []);

  const beginGesture = useCallback((clientX: number, clientY: number, depth: MarqueeDepth) => {
    _suppressNextSelectionBox = false;
    startRef.current = { x: clientX, y: clientY };
    isDraggingRef.current = false;
    marqueeDepthRef.current = depth;
    lastMoveRef.current = null;

    const ctrl = getActiveAutoPan();
    if (!ctrl) return;
    ctrl.setActive('selection-box', true);
    const unsub = ctrl.onTick(() => {
      const last = lastMoveRef.current;
      if (last) redraw(last.x, last.y);
    });
    autoPanCleanupRef.current = () => {
      unsub();
      ctrl.setActive('selection-box', false);
    };
  }, [redraw]);

  const canBegin = useCallback((detail: {
    button?: number;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    pointerType?: string;
  }) => {
    if (!isActive || isViewerMode()) return false;
    // Touch uses the mobile direct-manipulation contract: empty-canvas drag
    // pans. Marquee remains a desktop pointer gesture until a deliberate
    // long-press mobile marquee affordance is added.
    if (detail.pointerType === 'touch') return false;
    if ((detail.button ?? 0) !== 0) return false;
    if (isSpaceBarDown()) return false;
    // Option/Alt is reserved for duplication/alternate gestures. Cmd/Ctrl is
    // intentionally allowed: Figma uses it to make a marquee select nested
    // layers instead of their containing surface.
    if (detail.altKey) return false;
    return true;
  }, [isActive]);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!canBegin(e)) return;
    const target = e.target as HTMLElement;
    if (!containerEl) return;
    const isCanvasContainer = target === containerEl;
    const isCanvasInputSurface = target.hasAttribute('data-canvas-input-surface');
    const isContentRoot = target === contentElRef.current;
    const isViewportRoot = target.hasAttribute('data-viewport') && !target.hasAttribute('data-id');
    const passed = isCanvasContainer || isCanvasInputSurface || isContentRoot || isViewportRoot;
    trace.action('selection-box:pointerdown-check', {
      source: 'host',
      tagName: target.tagName,
      dataId: target.getAttribute('data-id'),
      dataViewport: target.getAttribute('data-viewport'),
      isCanvasContainer, isCanvasInputSurface, isContentRoot, isViewportRoot,
      passed,
    });
    if (!passed) return;
    beginGesture(e.clientX, e.clientY, e.metaKey || e.ctrlKey ? 'deep' : 'surface');
  }, [beginGesture, canBegin, containerEl]);

  const handleSandboxMouseDown = useCallback((event: Event) => {
    const detail = (event as CustomEvent<{
      clientX: number;
      clientY: number;
      button?: number;
      ctrlKey?: boolean;
      metaKey?: boolean;
      altKey?: boolean;
    }>).detail;
    if (!detail || !canBegin(detail)) return;
    // Generic sandbox mousedown fires for nodes too. The nodeMouseDown path owns
    // those presses; marquee only starts on geometry-empty iframe background.
    if (getNodeHitsAtPoint(detail.clientX, detail.clientY).length > 0) return;
    trace.action('selection-box:pointerdown-check', {
      source: 'sandbox',
      isCanvasContainer: false,
      isContentRoot: false,
      isViewportRoot: true,
      passed: true,
    });
    beginGesture(detail.clientX, detail.clientY, detail.metaKey || detail.ctrlKey ? 'deep' : 'surface');
  }, [beginGesture, canBegin]);

  const handleMoveAt = useCallback((clientX: number, clientY: number) => {
    if (!startRef.current) return;
    if (_suppressNextSelectionBox) {
      _suppressNextSelectionBox = false;
      stopGesture();
      return;
    }
    lastMoveRef.current = { x: clientX, y: clientY };
    const dx = clientX - startRef.current.x;
    const dy = clientY - startRef.current.y;
    if (!isDraggingRef.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      isDraggingRef.current = true;
      trace.action('selection-box:start', { x: startRef.current.x, y: startRef.current.y });
    }
    redraw(clientX, clientY);
    const content = contentElRef.current;
    if (content) {
      const rect: BoxRect = {
        x: Math.min(startRef.current.x, clientX),
        y: Math.min(startRef.current.y, clientY),
        width: Math.abs(dx),
        height: Math.abs(dy),
      };
      const sel = getMarqueeSelection(content, rect, marqueeDepthRef.current);
      trace.action('selection-box:intersect', {
        selectionRect: rect,
        foundIds: sel.ids,
        vpId: sel.vpId,
        depth: marqueeDepthRef.current,
        viewportRootCount: content.querySelectorAll('[data-viewport]').length,
      });
    }
  }, [redraw, stopGesture]);

  const handlePointerMove = useCallback((e: PointerEvent) => handleMoveAt(e.clientX, e.clientY), [handleMoveAt]);
  const handleSandboxMouseMove = useCallback((event: Event) => {
    const detail = (event as CustomEvent<{ clientX: number; clientY: number }>).detail;
    if (detail) handleMoveAt(detail.clientX, detail.clientY);
  }, [handleMoveAt]);

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current) trace.action('selection-box:end', { hadSelection: true });
    stopGesture();
  }, [stopGesture]);

  useEffect(() => {
    if (!containerEl || !isActive) return;
    containerEl.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', handlePointerUp);
    document.addEventListener('field:sandbox-mousedown', handleSandboxMouseDown);
    document.addEventListener('field:sandbox-mousemove', handleSandboxMouseMove);
    document.addEventListener('field:sandbox-mouseup', handlePointerUp);
    document.addEventListener('field:sandbox-mousecancel', handlePointerUp);

    return () => {
      containerEl.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
      document.removeEventListener('field:sandbox-mousedown', handleSandboxMouseDown);
      document.removeEventListener('field:sandbox-mousemove', handleSandboxMouseMove);
      document.removeEventListener('field:sandbox-mouseup', handlePointerUp);
      document.removeEventListener('field:sandbox-mousecancel', handlePointerUp);
      autoPanCleanupRef.current?.();
      autoPanCleanupRef.current = null;
    };
  }, [containerEl, isActive, handlePointerDown, handlePointerMove, handlePointerUp, handleSandboxMouseDown, handleSandboxMouseMove]);

  if (!box) return null;
  return (
    <div
      data-selection-box
      style={{
        position: 'fixed',
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        backgroundColor: 'color-mix(in srgb, var(--selection) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--selection) 60%, transparent)',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
