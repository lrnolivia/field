// PaddingHandles.tsx — Figma-shaped padding handles on layout frames.
// One side changes by default; Option links the opposite side, and
// Option+Shift changes all four. Click a handle to enter an exact value.

import React, { useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { isComponentFileAtom, getNodesSnapshot } from '@/code/stores/store';
import { useLiveNode } from '@/code/stores/node-family';
import { viewportsConfigAtom } from '@/code/stores/viewport-store';
import { resolveOverlaySize, resolveOverlaySpacing } from './overlay-size';
import { findNodeRect, findNodeComputedStyles, updateNodeStyles, getContentRoot } from '@/canvas/node-ops';
import { transformManager } from '@/canvas/transform';
import { nodeOrAncestorHasRotationOrSkewById } from '@/canvas/resize/geometry-utils';
import { isFitSize } from '@/shared/constants';
import { setPaddingSide } from '@/editor/tools/layout-padding';
import { paddingDragAmount, paddingDragStyles, type PaddingSide } from './padding-handle-logic';
import { styleHelperOps } from './style-helper-store';
import { displayEstablishesLayout } from './handle-gates';
import { trace } from '@/shared/debug-trace';

type Side = PaddingSide;
const SIDE_INDEX: Record<Side, number> = { top: 0, right: 1, bottom: 2, left: 3 };
const PADDING_HANDLE_COLOR = '#f472b6';

const parsePadding = (v: string | undefined): number => {
  if (!v) return 0;
  const match = v.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
};

// Used for drag direction: a hugging frame expands outward while a fixed frame
// keeps its edge and pushes content inward.
const isAutoOrFit = (v: string | undefined): boolean => isFitSize(v);

/**
 * Padding-band thickness per side, taken straight from the element's RESOLVED
 * computed padding.
 *
 * Padding handles show on selected flex/grid containers, regardless of whether
 * the frame has fixed or hugging dimensions. The CSS padding value is the
 * gap between content and edge. Reading
 * it from `getComputedStyle` is both exact and robust, where measuring child rects
 * is not: a `.map()` repeater lists only its template node in the NodeMap (so the
 * bridge sees just the FIRST repeated item — e.g. a grid's row 1 — and the bottom
 * handle docks mid-element), and component-instance (`display:contents`) wrappers
 * and glide wrappers further muddy per-child rects. Padding is the source of truth.
 *
 * Returns CSS/canvas px — the caller must multiply by the canvas zoom to convert to
 * the screen-space `frameRect` lives in.
 */
function getPaddingBands(
  computedStyles: Record<string, string>,
): { top: number; bottom: number; left: number; right: number } {
  const px = (camel: string, kebab: string) =>
    Math.max(0, parseFloat(computedStyles[camel] ?? computedStyles[kebab] ?? '') || 0);
  return {
    top: px('paddingTop', 'padding-top'),
    bottom: px('paddingBottom', 'padding-bottom'),
    left: px('paddingLeft', 'padding-left'),
    right: px('paddingRight', 'padding-right'),
  };
}

interface Props {
  nodeId: string;
  vpId: string;
  onInteracting: (v: boolean) => void;
}

export default function PaddingHandles({ nodeId, vpId, onInteracting }: Props) {
  // Per-node subscription — the handles only depend on the selected node;
  // commits elsewhere no longer re-render this overlay. The drag callback
  // below reads a fresh snapshot at pointer-down instead.
  // LIVE, not `useNode`: a drop that bakes auto → px only reaches
  // the parsed `nodesAtom` after the deferred fan-out (~90ms on a mid-size
  // page). Reading the parsed map painted the auto-state handles on the mouseup
  // frame and pulled them a tenth of a second later (user report 2026-08-09).
  // `useLiveNode` reads the imperative cache, which `exit-commit` writes
  // synchronously, and its gesture gate keeps this from re-rendering per frame
  // mid-drag. Same reason ControlProvider uses it.
  const node = useLiveNode(nodeId);
  const viewportConfigs = useAtomValue(viewportsConfigAtom);
  const isComponentFile = useAtomValue(isComponentFileAtom);
  const [hoveredHandle, setHoveredHandle] = useState<Side | null>(null);
  const [editingSide, setEditingSide] = useState<Side | null>(null);
  const [editingValue, setEditingValue] = useState('0');
  const startAdjustingPadding = useCallback((side: Side) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const contentEl = getContentRoot();
    if (!contentEl) return;

    const scale = transformManager.getTransform().scale;
    const startX = e.clientX;
    const startY = e.clientY;

    // Read current padding from node styles (code source of truth) — fresh
    // imperative snapshot at pointer-down (no subscription needed).
    const snapNode = getNodesSnapshot().get(nodeId);
    // Effective sides for THIS artboard, not the base object: order-aware (a
    // legacy mix of longhands + a trailing `padding` shorthand RENDERS the
    // shorthand) AND replica/variant-aware. Reading the base made a drag on a
    // replica start from the PRIMARY's padding — inline `58px` under a mobile
    // band of `12px` began at 58 and jumped on the first move. Same resolver
    // family as the handle-visibility read above, so both agree with the panel.
    const effSides = snapNode
      ? resolveOverlaySpacing(snapNode, vpId, viewportConfigs, isComponentFile, 'padding')
      : ['', '', '', ''] as [string, string, string, string];
    const pTop = parsePadding(effSides[0]);
    const pRight = parsePadding(effSides[1]);
    const pBottom = parsePadding(effSides[2]);
    const pLeft = parsePadding(effSides[3]);

    const sides: [string, string, string, string] = [`${pTop}px`, `${pRight}px`, `${pBottom}px`, `${pLeft}px`];
    const currentValue = parsePadding(sides[SIDE_INDEX[side]]);
    const size = snapNode ? resolveOverlaySize(snapNode, vpId, viewportConfigs, isComponentFile) : null;
    const hugsAxis = isAutoOrFit(side === 'top' || side === 'bottom' ? size?.height : size?.width);

    trace.action('padding-handle:start', {
      nodeId, side, currentValue, vpId, isComponentFile,
      effSides, baseStyles: { padding: snapNode?.styles?.padding, paddingTop: snapNode?.styles?.paddingTop },
    });
    let lastStyles: Record<string, string> = {};
    let moved = false;

    const onMove = (me: PointerEvent) => {
      me.preventDefault();
      if (Math.hypot(me.clientX - startX, me.clientY - startY) < 3) return;
      if (!moved) {
        moved = true;
        // SelectionOverlay unmounts handles while an edit gesture is active.
        // Wait until real movement so a click can open the exact-value input.
        onInteracting(true);
      }
      const deltaX = (me.clientX - startX) / scale;
      const deltaY = (me.clientY - startY) / scale;
      const amount = paddingDragAmount(side, deltaX, deltaY, hugsAxis);
      const styles = paddingDragStyles(sides, side, amount, me.altKey, me.altKey && me.shiftKey, me.shiftKey);
      const newValue = parsePadding(styles[`padding${side[0].toUpperCase()}${side.slice(1)}`]);

      // Imperative DOM update via bridge — sync to all variant copies
      lastStyles = styles;
      updateNodeStyles({ id: nodeId, styles, contentEl, domOnly: true });

      styleHelperOps.show({
        type: 'padding',
        position: { x: me.clientX, y: me.clientY },
        value: newValue,
        unit: 'px',
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      // Commit last known styles to code
      if (Object.keys(lastStyles).length > 0) {
        updateNodeStyles({ id: nodeId, styles: lastStyles, contentEl });
      } else if (!moved) {
        setEditingSide(side);
        setEditingValue(String(currentValue));
      }
      styleHelperOps.hide();
      if (moved) onInteracting(false);
      trace.action('padding-handle:end', { nodeId });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [nodeId, onInteracting, vpId, viewportConfigs, isComponentFile]);

  const commitExactValue = useCallback((side: Side, value: string) => {
    const contentEl = getContentRoot();
    const snapNode = getNodesSnapshot().get(nodeId);
    if (contentEl && snapNode) {
      const sides = resolveOverlaySpacing(snapNode, vpId, viewportConfigs, isComponentFile, 'padding');
      updateNodeStyles({ id: nodeId, styles: setPaddingSide(sides, SIDE_INDEX[side], value), contentEl });
    }
    setEditingSide(null);
  }, [nodeId, vpId, viewportConfigs, isComponentFile]);

  // ─── Early returns ──────────────────────────────────────────────────────

  const scale = transformManager.getTransform().scale;
  const frameRect = findNodeRect(nodeId, vpId);
  if (!frameRect || !node || scale < 0.2) return null;

  // Hide padding handles when the frame or any ancestor has rotation/skew —
  // the handles are screen-aligned (`position:fixed` in screen space) and
  // would land off the visible padding edge once the parent's transform
  // tilts the children away from the AABB axes the handle math assumes.
  if (nodeOrAncestorHasRotationOrSkewById(nodeId, vpId)) return null;

  const computedStyles = findNodeComputedStyles(nodeId, vpId, ['display', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left']);
  // The same selected frame exposes padding in the inspector. Fixed and hug
  // dimensions both show handles; sizing only changes drag direction.
  if (!displayEstablishesLayout(computedStyles['display'] || '')) {
    trace.fn('padding-handles:no-layout', { nodeId, display: computedStyles['display'] || '' });
    return null;
  }
  // `getPaddingBands` returns the padding in CSS/canvas px, but `frameRect` (and all
  // the handle/overlay geometry below) is SCREEN px — already multiplied by the
  // canvas zoom. Scale the padding to screen px so they match; otherwise at any
  // zoom ≠ 100% the handle drifts toward the element centre and the hover band is
  // drawn taller than the real padding region (bleeding over the content).
  const padCss = getPaddingBands(computedStyles);
  // The canvas should stay quiet until this frame actually has padding.
  // Zero-value padding remains editable in the inspector, but showing four
  // handles around every new layout frame makes selection feel noisy.
  if (padCss.top <= 0 && padCss.right <= 0 && padCss.bottom <= 0 && padCss.left <= 0) return null;
  const contentBounds = {
    top: padCss.top * scale,
    bottom: padCss.bottom * scale,
    left: padCss.left * scale,
    right: padCss.right * scale,
  };
  const minPaddingArea = 8;

  const paddingAreas = {
    top: Math.max(contentBounds.top, minPaddingArea),
    bottom: Math.max(contentBounds.bottom, minPaddingArea),
    left: Math.max(contentBounds.left, minPaddingArea),
    right: Math.max(contentBounds.right, minPaddingArea),
  };

  // Fixed screen-space sizes, clamped to container
  let handleW = 28;
  const handleH = 4;

  const maxH = frameRect.width * 0.8;
  const maxV = frameRect.height * 0.8;
  handleW = Math.min(handleW, maxH, maxV);
  if (handleW < 4) return null;

  // ─── Build elements ─────────────────────────────────────────────────────

  const elements: React.ReactNode[] = [];

  const addSide = (side: Side) => {
    const isVert = side === 'top' || side === 'bottom';
    const area = paddingAreas[side];
    const hasRealPadding = area > minPaddingArea;

    // Background overlay position (screen-space)
    let bgStyle: React.CSSProperties;
    if (side === 'top') {
      bgStyle = { left: frameRect.left, top: frameRect.top, width: frameRect.width, height: area };
    } else if (side === 'bottom') {
      bgStyle = { left: frameRect.left, top: frameRect.bottom - area, width: frameRect.width, height: area };
    } else if (side === 'left') {
      bgStyle = { left: frameRect.left, top: frameRect.top, width: area, height: frameRect.height };
    } else {
      bgStyle = { left: frameRect.right - area, top: frameRect.top, width: area, height: frameRect.height };
    }

    elements.push(
      <div
        key={`pad-bg-${side}`}
        style={{
          position: 'fixed',
          ...bgStyle,
          backgroundColor: 'rgba(244, 114, 182, 0.13)',
          opacity: hoveredHandle === side ? 1 : 0,
          transition: 'opacity 150ms',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
    );

    // Handle position (centered in padding area or on edge)
    let hx: number, hy: number;
    if (side === 'top') {
      hx = frameRect.left + frameRect.width / 2;
      hy = hasRealPadding ? frameRect.top + area / 2 : frameRect.top;
    } else if (side === 'bottom') {
      hx = frameRect.left + frameRect.width / 2;
      hy = hasRealPadding ? frameRect.bottom - area / 2 : frameRect.bottom;
    } else if (side === 'left') {
      hx = hasRealPadding ? frameRect.left + area / 2 : frameRect.left;
      hy = frameRect.top + frameRect.height / 2;
    } else {
      hx = hasRealPadding ? frameRect.right - area / 2 : frameRect.right;
      hy = frameRect.top + frameRect.height / 2;
    }

    const w = isVert ? handleW + 12 : handleH + 12;
    const h = isVert ? handleH + 12 : handleW + 12;

    elements.push(
      <button
        key={`pad-handle-${side}`}
        type="button"
        data-padding-handle={side}
        aria-label={`Adjust ${side} padding`}
        onPointerDown={startAdjustingPadding(side)}
        onClick={(event) => {
          if (event.detail !== 0) return;
          setEditingSide(side);
          setEditingValue(String(parsePadding(resolveOverlaySpacing(node, vpId, viewportConfigs, isComponentFile, 'padding')[SIDE_INDEX[side]])));
        }}
        onPointerEnter={() => setHoveredHandle(side)}
        onPointerLeave={() => setHoveredHandle(null)}
        style={{
          position: 'fixed',
          left: hx - w / 2,
          top: hy - h / 2,
          width: w,
          height: h,
          display: 'grid', placeItems: 'center',
          padding: 0, border: 0, background: 'transparent',
          cursor: isVert ? 'ns-resize' : 'ew-resize',
          pointerEvents: 'all',
          zIndex: 4,
        }}
      >
        <span aria-hidden style={{
          width: isVert ? handleW : handleH,
          height: isVert ? handleH : handleW,
          borderRadius: handleH / 2,
          backgroundColor: PADDING_HANDLE_COLOR,
          opacity: hoveredHandle === side ? 1 : .72,
        }} />
      </button>
    );

    if (editingSide === side) {
      elements.push(
        <input
          key={`pad-input-${side}`}
          data-padding-input={side}
          aria-label={`${side} padding in pixels`}
          type="number"
          min={0}
          max={999}
          autoFocus
          value={editingValue}
          onChange={(event) => setEditingValue(event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              event.currentTarget.dataset.cancelled = 'true';
              event.currentTarget.blur();
              setEditingSide(null);
            }
          }}
          onBlur={(event) => {
            if (event.currentTarget.dataset.cancelled !== 'true') commitExactValue(side, editingValue);
          }}
          style={{ position: 'fixed', left: hx + 9, top: hy + 9, width: 58,
            height: 26, zIndex: 5, borderRadius: 5, padding: '0 5px',
            border: '1px solid #f472b6', background: 'var(--bg-panel)',
            color: 'var(--text-primary)', fontSize: 12, textAlign: 'center' }}
        />
      );
    }
  };

  addSide('top');
  addSide('bottom');
  addSide('left');
  addSide('right');

  return <>{elements}</>;
}
