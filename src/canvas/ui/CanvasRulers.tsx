// Canvas rulers and the live preview when pulling a guide from either ruler.

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAtomValue, useStore } from 'jotai';
import { transformManager } from '@/canvas/transform';
import { isViewerMode, useIsViewer } from '@/code/stores/viewer-mode-store';
import { showRulersAtom } from '@/code/stores/user-preferences-store';
import { useTopChromeHeight } from './use-top-chrome-height';
import { activeFilePathAtom } from '@/code/project/active-file-store';
import { rulerGuideOps, draggingGuidePreviewAtom, type RulerGuide } from '@/code/stores/ruler-guides-store';
import { guideDropFrame, selectedGuideFrame } from './frame-ruler-guides';
import { selectedIdsAtom } from '@/code/stores/store';
import { shapeEditingIdAtom } from '@/code/stores/shape-edit-store';
import { interactingViewportIdAtom } from '@/code/stores/viewport-store';
import { findNodeRect } from '@/canvas/node-ops';
import { trace } from '@/shared/debug-trace';

export const RULER_SIZE = 28;
export const GUIDE_RULER_THRESHOLD = 10;
const CUT_UNDERLAP = 12;

export interface RulerInsets {
  left: number;
  right: number;
}

// Color tokens — pixel-match the builder repo's `CanvasRulers.tsx`:
//   bg     = `--bg-canvas` (lighter than `--bg-surface`, reads as a
//            ruler strip distinct from both the canvas content area
//            and the chrome panels around it)
//   border = `--border-default` (more contrast than `--border-light`,
//            so the ruler's edge against the canvas is actually visible)
//   ticks  = `--text-secondary` (low-contrast tick marks + numbers)
const RULER_BG = 'var(--bg-canvas)';
const RULER_BORDER = 'var(--border-default)';
const TICK_COLOR = 'var(--text-secondary)';
const TEXT_COLOR = 'var(--text-secondary)';
const GUIDE_COLOR = '#0d9488'; // teal — same as builder
// Accent color used for the selection-on-ruler highlight bands +
// position-indicator labels. Matches the canvas selection border so
// the user can visually link the selection on canvas with its measured
// extent on the rulers.
const SELECTION_ACCENT = 'var(--selection)';

// ─── Position indicator ──────────────────────────────────────────────────
// Tiny pill-shaped label that floats on a ruler at a given canvas-space
// coordinate, showing its rounded value. Used for both edges of the
// selection bounds (top ruler: left/right; left ruler: top/bottom).

interface PositionIndicatorProps {
  position: number;
  isHorizontal: boolean; // true → top ruler (X coord); false → left ruler (Y coord)
  transform: { x: number; y: number; scale: number };
  topOffset: number;
  left: number;
}

function PositionIndicator({ position, isHorizontal, transform, topOffset, left }: PositionIndicatorProps) {
  if (isHorizontal) {
    const screenX = position * transform.scale + transform.x;
    return (
      <div
        style={{
          position: 'fixed',
          top: topOffset,
          left: screenX,
          transform: 'translateX(-50%)',
          height: RULER_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4902,
          pointerEvents: 'none',
        }}
      >
        <span style={{
          color: SELECTION_ACCENT,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: RULER_BG,
          padding: '0 4px',
        }}>
          {Math.round(position)}
        </span>
      </div>
    );
  }
  const screenY = position * transform.scale + transform.y;
  return (
    <div
      style={{
        position: 'fixed',
        left,
        top: screenY,
        transform: 'translateY(-50%)',
        width: RULER_SIZE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4902,
        pointerEvents: 'none',
      }}
    >
      <span style={{
        color: SELECTION_ACCENT,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: RULER_BG,
        padding: '2px 0',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        transform: 'rotate(180deg)',
      }}>
        {Math.round(position)}
      </span>
    </div>
  );
}

// ─── Tick interval (zoom-aware) ────────────────────────────────────────────

/** Pick a ruler tick interval that gives ~50–100px between major ticks
 *  at the current zoom. As you zoom OUT, ticks coarsen (10 → 50 → 100
 *  → 500 → 1000…); as you zoom IN, they refine. Same scale ladder the
 *  builder rulers used. */
function getTickInterval(scale: number): number {
  const baseInterval = 100;
  const intervals = [10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  const ideal = baseInterval / scale;
  for (const i of intervals) if (i >= ideal * 0.5) return i;
  return intervals[intervals.length - 1];
}

interface RulerTicksProps {
  start: number;
  end: number;
  scale: number;
  isHorizontal: boolean;
}

const RulerTicks: React.FC<RulerTicksProps> = ({ start, end, scale, isHorizontal }) => {
  const ticks = useMemo(() => {
    const interval = getTickInterval(scale);
    const list: { value: number; major: boolean }[] = [];
    const firstTick = Math.floor(start / interval) * interval;
    for (let v = firstTick; v <= end; v += interval) {
      list.push({ value: v, major: v % (interval * 5) === 0 || interval >= 1000 });
    }
    return list;
  }, [start, end, scale]);

  return (
    <>
      {ticks.map(({ value, major }) => {
        const screenPos = value * scale;
        if (isHorizontal) {
          return (
            <React.Fragment key={value}>
              <line
                x1={screenPos} y1={RULER_SIZE}
                x2={screenPos} y2={major ? RULER_SIZE - 6 : RULER_SIZE - 4}
                stroke={TICK_COLOR} strokeWidth={1}
              />
              {major && (
                <text
                  x={screenPos} y={16}
                  fill={TEXT_COLOR} fontSize="10"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  textAnchor="middle"
                >
                  {value}
                </text>
              )}
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={value}>
            <line
              x1={RULER_SIZE} y1={screenPos}
              x2={major ? RULER_SIZE - 6 : RULER_SIZE - 4} y2={screenPos}
              stroke={TICK_COLOR} strokeWidth={1}
            />
            {major && (
              <text
                x={12} y={screenPos}
                fill={TEXT_COLOR} fontSize="10"
                fontFamily="system-ui, -apple-system, sans-serif"
                textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(-90, 12, ${screenPos})`}
              >
                {value}
              </text>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ─── Component ─────────────────────────────────────────────────────────────

/** Hook: subscribe to transformManager so the rulers re-render on every
 *  pan/zoom. Mirrors the `useDisplayTransform` pattern from the builder
 *  but tied to Revyme's transformManager. */
function useTransform() {
  const [transform, setTransform] = useState(transformManager.getAppliedTransform());
  useEffect(() => transformManager.subscribe(() => setTransform(transformManager.getAppliedTransform())), []);
  return transform;
}

export default function CanvasRulers({ left, right }: RulerInsets) {
  const leftUnderlap = Math.min(left, CUT_UNDERLAP);
  const rightUnderlap = Math.min(right, CUT_UNDERLAP);
  const showRulers = useAtomValue(showRulersAtom);
  const readOnly = useIsViewer();
  const transform = useTransform();
  const activeFilePath = useAtomValue(activeFilePathAtom);
  const draggingPreview = useAtomValue(draggingGuidePreviewAtom);
  const store = useStore();

  // Height of whatever breadcrumb bar is above the canvas, measured from the
  // DOM rather than re-derived from the file path — see use-top-chrome-height.ts.
  // Read through topOffsetRef below so the drag handlers see the latest value.
  const topOffset = useTopChromeHeight();

  // Container dimensions — track viewport size so the rulers extend to
  // the right edge of the screen. We avoid SSR (`window` access) by
  // reading on mount + on resize.
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── Drag from ruler → create guide ───────────────────────────────────
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);
  const dragRef = useRef<{ type: 'horizontal' | 'vertical'; filePath: string; frame?: RulerGuide['frame'] } | null>(null);
  const rulerEdgesRef = useRef({ left, topOffset });
  useEffect(() => { rulerEdgesRef.current = { left, topOffset }; }, [left, topOffset]);

  const cancelDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    store.set(draggingGuidePreviewAtom, null);
    document.body.style.cursor = '';
  }, [store]);

  const startDrag = (e: React.MouseEvent, type: 'horizontal' | 'vertical') => {
    if (e.button !== 0 || isViewerMode()) return;
    e.preventDefault();
    e.stopPropagation();
    const frame = selectedGuideFrame(store.get(selectedIdsAtom), store.get(interactingViewportIdAtom));
    dragRef.current = { type, filePath: activeFilePath, frame };
    const screenPosition = type === 'horizontal' ? e.clientY : e.clientX;
    store.set(draggingGuidePreviewAtom, { type, screenPosition });
    document.body.style.cursor = type === 'horizontal' ? 'row-resize' : 'col-resize';
  };

  useEffect(() => {
    if (!showRulers || readOnly) return;
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const screenPosition = drag.type === 'horizontal' ? e.clientY : e.clientX;
      const frame = guideDropFrame(drag.frame, e.clientX, e.clientY);
      store.set(draggingGuidePreviewAtom, { type: drag.type, screenPosition, frame });
    };
    const onUp = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || e.button !== 0) return;
      cancelDrag();
      if (drag.filePath !== store.get(activeFilePathAtom)) return;
      const t = transformManager.getAppliedTransform();
      const edges = rulerEdgesRef.current;
      const horizontal = drag.type === 'horizontal';
      const cursor = horizontal ? e.clientY : e.clientX;
      const rulerEdge = (horizontal ? edges.topOffset : edges.left) + RULER_SIZE;
      if (cursor - rulerEdge < GUIDE_RULER_THRESHOLD) return;
      // The full-bleed Canvas starts at (0, 0). The chrome moves the ruler
      // strip, while guide positions share the camera origin with snap lines.
      const frame = guideDropFrame(drag.frame, e.clientX, e.clientY);
      const origin = frame ? (horizontal ? frame.top : frame.left) : (horizontal ? t.y : t.x);
      const position = (cursor - origin) / t.scale;
      rulerGuideOps.addGuide(drag.filePath, drag.type, position, frame ? drag.frame : undefined);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKey);
    window.addEventListener('blur', cancelDrag);
    return () => {
      cancelDrag();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', cancelDrag);
    };
  }, [activeFilePath, cancelDrag, readOnly, showRulers, store]);

  // ─── Selection bounds (highlight bands on rulers) ─────────────────
  // For each selected node, read its viewport-space rect from the
  // bridge cache, convert to canvas-space, and aggregate to a union
  // bounding box. RAF-poll so the bands track the selection live
  // through resize / drag (the rectCache updates on every patchStyles,
  // so this poll naturally stays in sync).
  const selectedIds = useAtomValue(selectedIdsAtom);
  // While shape-editing / drawing a path, the selected node is the
  // viewport-sized seed — its bounds would paint the ruler bands across the
  // whole ruler. Suppress the bands entirely during shape-edit.
  const shapeEditingId = useAtomValue(shapeEditingIdAtom);
  const interactingVpId = useAtomValue(interactingViewportIdAtom);
  const [selectionBounds, setSelectionBounds] = useState<
    | { left: number; right: number; top: number; bottom: number }
    | null
  >(null);
  const selectedIdsRef = useRef(selectedIds);
  const interactingVpIdRef = useRef(interactingVpId);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => { interactingVpIdRef.current = interactingVpId; }, [interactingVpId]);

  useEffect(() => {
    if (selectedIds.length === 0 || shapeEditingId) {
      setSelectionBounds(null);
      return;
    }
    let raf = 0;
    const rectState = new Map<string, string>(); // DIAGNOSTIC: track rect availability transitions
    const compute = () => {
      const ids = selectedIdsRef.current;
      const vpId = interactingVpIdRef.current || 'desktop';
      const t = transformRef.current;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let any = false;
      for (const id of ids) {
        const rect = findNodeRect(id, vpId);
        // DIAGNOSTIC (temporary): when does the ruler first get a usable rect
        // for a freshly-selected node? Logs only on state change to avoid spam.
        const st = rect ? (rect.width > 0 ? 'valid' : 'zero') : 'null';
        if (st !== rectState.get(id)) {
          rectState.set(id, st);
          trace.action('ruler:selrect-state', { id, vpId, state: st, w: rect?.width ?? -1, left: rect?.left ?? -1 });
        }
        if (!rect) continue;
        // findNodeRect returns viewport coords (bridge already applied
        // toParentSpace + transform-delta adjust). Convert to canvas-
        // space using the same `(viewport_x - transform.x) / scale`
        // formula the SVG-tick render uses → guarantees the
        // selection band aligns with the ruler ticks.
        const cl = (rect.left - t.x) / t.scale;
        const cr = (rect.left + rect.width - t.x) / t.scale;
        const ct = (rect.top - t.y) / t.scale;
        const cb = (rect.top + rect.height - t.y) / t.scale;
        if (cl < minX) minX = cl;
        if (cr > maxX) maxX = cr;
        if (ct < minY) minY = ct;
        if (cb > maxY) maxY = cb;
        any = true;
      }
      const next = any
        ? { left: minX, right: maxX, top: minY, bottom: maxY }
        : null;
      // Bail out of state updates when bounds are stable so the RAF
      // loop doesn't churn React renders during static selection.
      setSelectionBounds((prev) => {
        if (!prev && !next) return prev;
        if (prev && next
            && Math.abs(prev.left - next.left) < 0.5
            && Math.abs(prev.right - next.right) < 0.5
            && Math.abs(prev.top - next.top) < 0.5
            && Math.abs(prev.bottom - next.bottom) < 0.5) return prev;
        return next;
      });
      raf = requestAnimationFrame(compute);
    };
    // Run the FIRST compute SYNCHRONOUSLY (don't defer to the next animation
    // frame). On a fresh selection the node's rect is already in the cache (the
    // creator seeds it), but `requestAnimationFrame` pushes the first read behind
    // the React selection work, so the ruler's selection band appeared ~90ms
    // after the resize handles. Computing inline lands it in the same beat;
    // `compute` then schedules the live RAF loop for subsequent frames.
    compute();
    return () => cancelAnimationFrame(raf);
  }, [selectedIds, shapeEditingId]);

  if (!showRulers) return null;

  // Visible canvas-coord range for tick generation.
  const visibleStartX = (left - transform.x) / transform.scale;
  const visibleEndX = (viewport.w - right + rightUnderlap - transform.x) / transform.scale;
  const visibleStartY = (topOffset - transform.y) / transform.scale;
  const visibleEndY = (viewport.h - transform.y) / transform.scale;

  trace.fn('CanvasRulers:render', {
    scale: Math.round(transform.scale * 100) / 100,
    interval: getTickInterval(transform.scale),
  });

  return (
    <>
      {/* Rulers extend under the docked panels' cut corners. Floating
          panels paint above the rulers without changing Canvas coordinates. */}
      <div
        data-ruler
        onMouseDown={(event) => startDrag(event, 'horizontal')}
        style={{
          position: 'fixed',
          top: topOffset,
          left: left + RULER_SIZE,
          right: right - rightUnderlap,
          height: RULER_SIZE,
          backgroundColor: RULER_BG,
          borderBottom: `1px solid ${RULER_BORDER}`,
          zIndex: 4900,
          cursor: readOnly ? 'default' : 'row-resize',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        <svg width="100%" height={RULER_SIZE} style={{ position: 'absolute', left: 0, top: 0 }}>
          <g transform={`translate(${transform.x - left - RULER_SIZE}, 0)`}>
            <RulerTicks start={visibleStartX} end={visibleEndX} scale={transform.scale} isHorizontal />
          </g>
        </svg>
      </div>

      {/* Left ruler */}
      <div
        data-ruler
        onMouseDown={(event) => startDrag(event, 'vertical')}
        style={{
          position: 'fixed',
          top: topOffset + RULER_SIZE,
          left: left - leftUnderlap,
          bottom: 0,
          width: RULER_SIZE + leftUnderlap,
          backgroundColor: RULER_BG,
          borderRight: `1px solid ${RULER_BORDER}`,
          zIndex: 4900,
          cursor: readOnly ? 'default' : 'col-resize',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        {/* The underlap is blank behind the docked panel's cut corner. */}
        <svg width={RULER_SIZE} height="100%" style={{ position: 'absolute', left: leftUnderlap, top: 0 }}>
          <g transform={`translate(0, ${transform.y - topOffset - RULER_SIZE})`}>
            <RulerTicks start={visibleStartY} end={visibleEndY} scale={transform.scale} isHorizontal={false} />
          </g>
        </svg>
      </div>

      {/* Corner square — covers the L-intersection with a tinted glass
          panel: semi-transparent ruler-bg + backdrop-filter blur so any
          canvas content peeking through reads as soft chrome (matches
          the old `../../builder` corner treatment).
          z-index 4910 sits ABOVE every ruler-internal layer (bands at
          4903, drag preview at 4905, position indicators at 4902) so
          selection bands and indicator pills cleanly hide BEHIND the
          corner instead of painting over it — but stays below the
          right panel chrome (5000+) so it never covers UI panels. */}
      <div
        data-ruler
        style={{
          position: 'fixed',
          top: topOffset,
          left,
          width: RULER_SIZE,
          height: RULER_SIZE,
          backgroundColor: 'color-mix(in srgb, var(--bg-canvas) 70%, transparent)',
          backdropFilter: 'blur(8px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(8px) saturate(1.1)',
          borderRight: `1px solid ${RULER_BORDER}`,
          borderBottom: `1px solid ${RULER_BORDER}`,
          zIndex: 4910,
          pointerEvents: 'none',
        }}
      />

      {/* Selection bounds — highlight bands on both rulers showing the
          width / height of the current selection in canvas-space.
          Ports the builder's "selectionBounds" feature: opaque accent
          band between the selection's edges + 1 px edge line on the
          inner ruler edge + 8 px tick marks at each edge + a position-
          indicator pill showing the canvas-space coord. Mirrored on the
          left ruler for vertical extent.
          screen_x for canvas_x = canvas_x * transform.scale + transform.x */}
      {selectionBounds && (() => {
        const sb = selectionBounds;
        const screenLeft   = sb.left   * transform.scale + transform.x;
        const screenRight  = sb.right  * transform.scale + transform.x;
        const screenTop    = sb.top    * transform.scale + transform.y;
        const screenBottom = sb.bottom * transform.scale + transform.y;
        const widthScreen  = Math.max(1, screenRight - screenLeft);
        const heightScreen = Math.max(1, screenBottom - screenTop);
        return (
          <>
            {/* Top ruler — opaque accent band between selection edges */}
            <div style={{
              position: 'fixed', top: topOffset, left: screenLeft,
              width: widthScreen, height: RULER_SIZE,
              backgroundColor: SELECTION_ACCENT, opacity: 0.12,
              pointerEvents: 'none', zIndex: 4901,
            }} />
            {/* Top ruler — 1 px edge line at the bottom (against canvas) */}
            <div style={{
              position: 'fixed', top: topOffset + RULER_SIZE - 1, left: screenLeft,
              width: widthScreen, height: 1,
              backgroundColor: SELECTION_ACCENT,
              pointerEvents: 'none', zIndex: 4903,
            }} />
            {/* Top ruler — 8 px tick marks at each edge */}
            <div style={{
              position: 'fixed', top: topOffset + RULER_SIZE - 8, left: screenLeft,
              width: 1, height: 8, backgroundColor: SELECTION_ACCENT,
              pointerEvents: 'none', zIndex: 4903,
            }} />
            <div style={{
              position: 'fixed', top: topOffset + RULER_SIZE - 8, left: screenRight,
              width: 1, height: 8, backgroundColor: SELECTION_ACCENT,
              pointerEvents: 'none', zIndex: 4903,
            }} />
            {/* Left ruler — accent band (spans the underlap extension too so
                the band reads as continuing behind the panel's bottom notch) */}
            <div style={{
              position: 'fixed', left: left - leftUnderlap, top: screenTop,
              width: RULER_SIZE + leftUnderlap, height: heightScreen,
              backgroundColor: SELECTION_ACCENT, opacity: 0.12,
              pointerEvents: 'none', zIndex: 4901,
            }} />
            {/* Left ruler — 1 px edge line at the right (against canvas) */}
            <div style={{
              position: 'fixed', left: left + RULER_SIZE - 1, top: screenTop,
              width: 1, height: heightScreen,
              backgroundColor: SELECTION_ACCENT,
              pointerEvents: 'none', zIndex: 4903,
            }} />
            {/* Left ruler — 8 px tick marks at each edge */}
            <div style={{
              position: 'fixed', left: left + RULER_SIZE - 8, top: screenTop,
              width: 8, height: 1, backgroundColor: SELECTION_ACCENT,
              pointerEvents: 'none', zIndex: 4903,
            }} />
            <div style={{
              position: 'fixed', left: left + RULER_SIZE - 8, top: screenBottom,
              width: 8, height: 1, backgroundColor: SELECTION_ACCENT,
              pointerEvents: 'none', zIndex: 4903,
            }} />
            {/* Position-indicator labels at each edge — canvas-space coords */}
            <PositionIndicator position={sb.left}   isHorizontal transform={transform} topOffset={topOffset} left={left} />
            <PositionIndicator position={sb.right}  isHorizontal transform={transform} topOffset={topOffset} left={left} />
            <PositionIndicator position={sb.top}    isHorizontal={false} transform={transform} topOffset={topOffset} left={left} />
            <PositionIndicator position={sb.bottom} isHorizontal={false} transform={transform} topOffset={topOffset} left={left} />
          </>
        );
      })()}

      {/* Drag preview follows the pointer while a new guide is being placed. */}
      {draggingPreview && draggingPreview.type === 'horizontal' && (
        <div
          style={{
            position: 'fixed',
            left: Math.max(left + RULER_SIZE, draggingPreview.frame?.left ?? -Infinity),
            right: draggingPreview.frame ? Math.max(right, viewport.w - draggingPreview.frame.right) : right,
            top: draggingPreview.screenPosition,
            height: 1,
            backgroundColor: GUIDE_COLOR,
            pointerEvents: 'none',
            zIndex: 4905,
          }}
        />
      )}
      {draggingPreview && draggingPreview.type === 'vertical' && (
        <div
          style={{
            position: 'fixed',
            top: Math.max(topOffset + RULER_SIZE, draggingPreview.frame?.top ?? -Infinity),
            bottom: draggingPreview.frame ? Math.max(0, viewport.h - draggingPreview.frame.bottom) : 0,
            left: draggingPreview.screenPosition,
            width: 1,
            backgroundColor: GUIDE_COLOR,
            pointerEvents: 'none',
            zIndex: 4905,
          }}
        />
      )}
    </>
  );
}
