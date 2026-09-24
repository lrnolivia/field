// PositionTool — Full position control: type, alignment, pins, coordinates.
// Shows different controls based on position type and parent context.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { ToolSection, ToolDivider, StyleField } from '../../controls';
import AlignmentControl, { AlignmentButtons } from './AlignmentControl';
import PositionTypeControl from './PositionTypeControl';
import PinControl from './PinControl';
import SpaceControl from './SpaceControl';
import { RotateControl } from '../StylesTool/atoms/RotateControl';
import { getContentRoot, findNodeSize, findNodeParentInnerSize, findNodeComputedStyle, updateNodeStyles } from '@/canvas/node-ops';
import { transformManager } from '@/canvas/transform';
import { nodeTreeStructureVersionAtom, getNodeFromCache } from '@/code/stores/store';
import { useNode, useNodesComputed } from '@/code/stores/node-family';
import { fitSizeRedirectTarget } from '@/editor/tools/size-helpers';
import { trace } from '@/shared/debug-trace';
import { captureVisualRect } from '@/canvas/visual-rect';
import { applyReplicaClearSemantics } from './replica-clears';
import { isPrimaryViewport } from '@/shared/constants';
import { shapeAlignStyles, shapePositionNormalizationStyles } from '@/shared/position-utils';
import { getPinState, parsePx, type AlignDirection } from '@/shared/pin-utils';
import ToolPopup from '../../ui/ToolPopup';

interface Props {
  nodeId: string;
  styles: Record<string, string>;
  vpId: string;
  isReplica: boolean;
  vpWidth: number;
  isTopLevel?: boolean;
}

interface ConstraintsActionProps {
  nodeId: string;
  vpId: string;
  position: string;
  styles: Record<string, string>;
  showPins: boolean;
  onUpdate: (key: string, value: string) => void;
  onUpdateMultiple: (styles: Record<string, string>) => void;
}

function ConstraintsAction({ nodeId, vpId, position, styles, showPins, onUpdate, onUpdateMultiple }: ConstraintsActionProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label="Constraints"
        title="Constraints"
        onClick={() => setOpen(v => !v)}
        className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-[var(--control-radius)]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
          <path d="M5 2.5H3.5a1 1 0 0 0-1 1V5M11 2.5h1.5a1 1 0 0 1 1 1V5M5 13.5H3.5a1 1 0 0 1-1-1V11M11 13.5h1.5a1 1 0 0 0 1-1V11" />
          <rect x="5" y="5" width="6" height="6" rx="1" />
        </svg>
      </button>
      <ToolPopup
        isOpen={open}
        onClose={() => setOpen(false)}
        title={showPins ? 'Constraints' : 'Position'}
        anchorRef={anchorRef}
        width={showPins ? 280 : 240}
        resetKey={nodeId}
      >
        <div className="flex flex-col gap-3 p-2">
          <PositionTypeControl
            position={position || 'static'}
            nodeId={nodeId}
            vpId={vpId}
            existingTransform={styles.transform}
            onUpdateMultiple={onUpdateMultiple}
          />
          {showPins && (
            <PinControl
              compact
              styles={styles}
              nodeId={nodeId}
              vpId={vpId}
              onUpdate={onUpdate}
              onUpdateMultiple={onUpdateMultiple}
            />
          )}
        </div>
      </ToolPopup>
    </>
  );
}

export default function PositionTool({ nodeId: nodeIdProp, styles: stylesProp, vpId, isReplica, vpWidth, isTopLevel }: Props) {
  // FIT-TEXT REDIRECT (mirrors SizeTool): the SVG wrapper is the layout
  // participant — position / pins / transform live ON it (fit-text-gen lifts
  // them at wrap). Selecting the inner <p> must read and write those keys on
  // the wrapper, or the panel says "absolute" while the canvas lays out a
  // flow child (live find 2026-09-06).
  const fitRedirectId = useNodesComputed((nodes) => fitSizeRedirectTarget(nodes, nodeIdProp), [nodeIdProp]);
  const isFitInnerRedirect = fitRedirectId != null;
  const nodeId = fitRedirectId ?? nodeIdProp;
  const fitWrapperNode = useNode(fitRedirectId);
  const styles = isFitInnerRedirect ? ((fitWrapperNode?.styles ?? {}) as Record<string, string>) : stylesProp;
  // During a REPARENT drag the node's parentId changes (canvas node → child of
  // a frame → absolute-in-frame), which flips this panel from the "Space" X/Y
  // coords to the L/T/R/B pins. That change lands in the IMPERATIVE node cache
  // mid-drag (moveNodeInCache) and bumps nodeTreeStructureVersionAtom — but
  // nodesAtom stays FROZEN until mouseup (the reparent commits are gated for
  // perf). Reading parentId from the live cache + re-rendering on the version
  // bump makes the Space↔pins switch happen DURING the drag, like it used to,
  // with zero parse. Falls back to the per-node subscription when the cache is
  // empty.
  const structureVersion = useAtomValue(nodeTreeStructureVersionAtom);
  const atomNode = useNode(nodeId);
  const liveNode = useMemo(
    () => getNodeFromCache(nodeId) ?? atomNode,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeId, atomNode, structureVersion],
  );
  const position = styles.position || '';
  const isAbsolute = position === 'absolute';
  const isFixed = position === 'fixed';
  const isSticky = position === 'sticky';
  const hasPosition = !!position;

  // Is this element absolute-positioned inside a non-static parent? (absolute-in-frame)
  const isAbsoluteInFrame = useMemo(() => {
    if (!isAbsolute) return false;
    if (!liveNode?.parentId) return false;
    const parentPos = findNodeComputedStyle(liveNode.parentId, vpId, 'position');
    return parentPos === 'relative' || parentPos === 'absolute' || parentPos === 'fixed';
  }, [isAbsolute, vpId, liveNode]);

  // An SVG GROUP (a <svg> wrapper whose children are themselves <svg> shapes) is
  // positioned as a single unit by plain left/top — the pin/inset model (anchor
  // to an edge, half/full inset) doesn't apply to a vector group and just
  // clutters the panel. Suppress the PinControl for groups: they always get the
  // simple X/Y coords (default left/top) + the alignment icons.
  const isSvgGroup = useNodesComputed(
    (nodes) => {
      if (liveNode?.type !== 'svg' || !Array.isArray(liveNode.children)) return false;
      return liveNode.children.some((cid) => (getNodeFromCache(cid) ?? nodes.get(cid))?.type === 'svg');
    },
    [liveNode],
  );

  // Any <svg> node (single shape OR group) uses the canonical shape model —
  // px X/Y + Size, no pins (reference parity; see position-utils). Pins can't be
  // made stable on a vector whose centering is a % of its own size.
  // A FIT wrapper is an <svg> carrying TEXT — it keeps the full pin model.
  const isSvgNode = liveNode?.type === 'svg' && !isFitInnerRedirect && !nodeId.endsWith('-svg');
  const showPins = (isAbsoluteInFrame || isFixed) && !isSvgGroup && !isSvgNode;
  const showCoords = isAbsolute || isFixed;

  // ─── Update helpers ───────────────────────────────────────────────

  // Single style update — imperative-first: DOM + cache + queue.
  // Always routes through `updateNodeStyles` (no separate replica
  // branch). That function already handles the page-vs-replica split
  // via ReplicaContext AND the solo-replica redirect (a node carrying
  // `data-replica-solo="<vpId>"` writes to BASE inline so master
  // values land there). A local short-circuit to
  // `updateContainerStyle` skipped both, breaking the solo redirect
  // for pin / position writes.
  const updateStyle = useCallback((key: string, value: string) => {
    const contentEl = getContentRoot();
    if (contentEl) {
      updateNodeStyles({ id: nodeId, styles: { [key]: value }, contentEl });
    }
    void isReplica; void vpWidth; // kept for clarity (consumed by updateNodeStyles via global context)
  }, [nodeId, isReplica, vpWidth]);

  // Multiple styles at once — imperative-first: DOM + cache + queue.
  // Same routing rationale as `updateStyle` above.
  const updateMultipleStyles = useCallback((newStyles: Record<string, string>) => {
    const contentEl = getContentRoot();
    if (contentEl) {
      updateNodeStyles({ id: nodeId, styles: newStyles, contentEl });
    }
    trace.action('position:update-multiple', { nodeId, styles: newStyles });
  }, [nodeId, isReplica, vpWidth]);

  // ─── Rect getters for alignment ───────────────────────────────────

  const getElementRect = useCallback(() => {
    // `findNodeSize` reports the element rect in PARENT-SCREEN space — it's
    // scaled by the canvas zoom. The parent rect (`findNodeParentInnerSize`
    // → `clientWidth`) is a layout property, zoom-independent. Divide the
    // element by the current zoom so both rects are in the same true-CSS-px
    // space — otherwise alignment is off by (1 − scale) × elementSize (e.g.
    // a half-width overflow at 50% zoom).
    const size = findNodeSize(nodeId, vpId);
    const scale = transformManager.getTransform().scale || 1;
    return { width: size.width / scale, height: size.height / scale };
  }, [nodeId, vpId]);

  const getParentRect = useCallback(() => {
    return findNodeParentInnerSize(nodeId, vpId);
  }, [nodeId, vpId]);

  // Shape align: canonical px placement (aligned axis + current other axis),
  // clearing pins and both centering channels in the same write — never the
  // `%` + translate recipe, which double-shifted shorthand-centred shapes.
  const handleShapeAlign = useCallback((dir: AlignDirection) => {
    const rect = captureVisualRect(nodeId, vpId);
    if (!rect) return;
    // On a variant tile the '' clears must mask the default entry (explicit
    // neutrals), or the deleted key just re-exposes `default.x: '-50%'`.
    const u = applyReplicaClearSemantics(nodeId, vpId, shapeAlignStyles(dir, rect));
    trace.action('alignment:apply-shape', { nodeId, dir, u });
    updateMultipleStyles(u);
  }, [nodeId, vpId, updateMultipleStyles]);

  // Shape X/Y field: a coordinate edit also lands the node in the canonical
  // model (a stale `%` on the other axis or a leftover shorthand would drift).
  const updateShapeCoord = useCallback((key: string, value: string) => {
    const rect = captureVisualRect(nodeId, vpId);
    // Canonical check on the TILE-EFFECTIVE map (inline ⊕ default ⊕ this
    // variant's entry) — a stale `x`/`%` can live in an entry, not the base.
    const mv = (liveNode?.motionVariants ?? {}) as Record<string, Record<string, unknown>>;
    const eff: Record<string, string> = { ...styles };
    for (const src of [mv.default, isPrimaryViewport(vpId) ? undefined : mv[vpId]]) {
      for (const [k, v] of Object.entries(src ?? {})) if (v != null && v !== '') eff[k] = String(v);
    }
    const base = rect ? (shapePositionNormalizationStyles(eff, rect) ?? {}) : {};
    updateMultipleStyles(applyReplicaClearSemantics(nodeId, vpId, { ...base, [key]: value }));
  }, [nodeId, vpId, styles, liveNode, updateMultipleStyles]);

  // Main Position X/Y fields represent the painted layout-box coordinate.
  // When a side is constrained, move the opposite inset in the inverse
  // direction so editing X/Y preserves the object's current size/constraint
  // relationship instead of silently breaking the constraint.
  const updatePositionCoord = useCallback((key: string, value: string) => {
    if (isSvgNode) {
      updateShapeCoord(key, value);
      return;
    }
    if (key !== 'left' && key !== 'top') {
      updateStyle(key, value);
      return;
    }
    const target = parseFloat(value);
    const rect = captureVisualRect(nodeId, vpId);
    if (!Number.isFinite(target) || !rect) {
      updateStyle(key, value);
      return;
    }
    const pins = getPinState(styles);
    const patch: Record<string, string> = {};
    if (key === 'left') {
      const delta = target - rect.left;
      if (pins.left) patch.left = `${parsePx(styles.left) + delta}px`;
      if (pins.right) patch.right = `${parsePx(styles.right) - delta}px`;
      if (!pins.left && !pins.right) patch.left = `${target}px`;
    } else {
      const delta = target - rect.top;
      if (pins.top) patch.top = `${parsePx(styles.top) + delta}px`;
      if (pins.bottom) patch.bottom = `${parsePx(styles.bottom) - delta}px`;
      if (!pins.top && !pins.bottom) patch.top = `${target}px`;
    }
    updateMultipleStyles(patch);
  }, [isSvgNode, updateShapeCoord, updateStyle, updateMultipleStyles, nodeId, vpId, styles]);

  // Top-level nodes (canvas nodes, variant roots): only show X/Y space
  if (isTopLevel) {
    return (
      <>
        <ToolSection title="Position">
          <SpaceControl
            left={styles.left || '0px'}
            top={styles.top || '0px'}
            nodeId={nodeId}
            vpId={vpId}
            onUpdate={updatePositionCoord}
          />
          <RotateControl compact />
        </ToolSection>
        <ToolDivider />
      </>
    );
  }

  return (
    <>
      <ToolSection
        title="Position"
        action={
          <ConstraintsAction
            nodeId={nodeId}
            vpId={vpId}
            position={position}
            styles={styles}
            showPins={showPins}
            onUpdate={updateStyle}
            onUpdateMultiple={updateMultipleStyles}
          />
        }
      >
        {/* Alignment icons — accent blue when enabled, disabled gray otherwise */}
        {isSvgNode ? (
          <AlignmentButtons enabled={isAbsolute || isFixed} onAlign={handleShapeAlign} />
        ) : (
          <AlignmentControl
            nodeId={nodeId}
            enabled={isAbsolute || isFixed}
            styles={styles}
            onUpdate={updateMultipleStyles}
            getElementRect={getElementRect}
            getParentRect={getParentRect}
          />
        )}

        {/* Position type + pin constraints moved into the section action popup.
            The primary inspector stays Figma-compact: align → X/Y → rotation. */}

        {/* X/Y coordinates for positioned objects. Pinned sides are preserved
            by updatePositionCoord instead of expanding into a giant inline grid. */}
        {showCoords && (
          <SpaceControl
            left={styles.left || '0px'}
            top={styles.top || '0px'}
            nodeId={nodeId}
            vpId={vpId}
            onUpdate={updatePositionCoord}
          />
        )}

        {/* Sticky offset — the scroll distance at which the element sticks */}
        {isSticky && (
          <StyleField property="top" label="Top" defaultValue="0px" />
        )}

        <RotateControl compact />
      </ToolSection>
      <ToolDivider />
    </>
  );
}
