// RulerGuides.tsx — Renders the persistent guide lines from the
// active file's `/** @rulerGuides [...] */` annotation. Each guide is
// a thin teal line spanning the canvas at its canvas-space position;
// drag to reposition, right-click for the Delete menu, Backspace to
// remove the selected one.
//
// Ported from `builder/src/builder/view/canvas/RulerGuides.tsx` and
// trimmed to Revyme's setup (no panel-open detection, no master-
// page filter — guide scoping is handled by per-file annotation
// persistence: each page / component / icon-set master gets its own
// guides because they live in that file's source).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { transformManager } from '@/canvas/transform';
import { showRulersAtom } from '@/code/stores/user-preferences-store';
import { useTopChromeHeight } from './use-top-chrome-height';
import { GUIDE_RULER_THRESHOLD, RULER_SIZE, type RulerInsets } from './CanvasRulers';
import { activeFilePathAtom } from '@/code/project/active-file-store';
import {
  activeRulerGuidesAtom,
  selectedGuideIdAtom,
  snappedRulerGuideIdsAtom,
  rulerGuideOps,
  type RulerGuide,
} from '@/code/stores/ruler-guides-store';
import { isViewerMode, useIsViewer } from '@/code/stores/viewer-mode-store';
import { selectedIdsAtom } from '@/code/stores/store';

const GUIDE_COLOR = '#0d9488';
const GUIDE_COLOR_SELECTED = 'var(--selection)';
const GUIDE_HIT_AREA = 8;

// ─── Single guide line ────────────────────────────────────────────────────

interface GuideLineProps extends RulerInsets {
  guide: RulerGuide;
  isSelected: boolean;
  readOnly: boolean;
  screenPosition: number;
  topOffset: number;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onStartDrag: (event: React.MouseEvent, guide: RulerGuide, screenPosition: number) => void;
}

const GuideLine: React.FC<GuideLineProps> = ({
  guide, isSelected, readOnly, screenPosition, topOffset, left, right, onSelect, onContextMenu, onStartDrag,
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isViewerMode()) return; // left-click only; right-click → context menu
    e.preventDefault();
    e.stopPropagation();
    onSelect(guide.id);
    onStartDrag(e, guide, screenPosition);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isViewerMode()) return;
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, guide.id);
  };

  if (guide.type === 'horizontal') {
    return (
      <div
        data-ruler-guide
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        style={{
          position: 'fixed',
          left: left + RULER_SIZE,
          right,
          top: screenPosition,
          height: 1,
          backgroundColor: isSelected ? GUIDE_COLOR_SELECTED : GUIDE_COLOR,
          pointerEvents: readOnly ? 'none' : 'auto',
          cursor: readOnly ? 'default' : 'row-resize',
          zIndex: 4895,
        }}
      >
        {/* Wider hit area centered on the line so the user can grab it
            without pixel-perfect aim. */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: -GUIDE_HIT_AREA / 2, height: GUIDE_HIT_AREA, cursor: readOnly ? 'default' : 'row-resize',
        }} />
      </div>
    );
  }
  return (
    <div
      data-ruler-guide
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      style={{
        position: 'fixed',
        top: topOffset + RULER_SIZE,
        bottom: 0,
        left: screenPosition,
        width: 1,
        backgroundColor: isSelected ? GUIDE_COLOR_SELECTED : GUIDE_COLOR,
        pointerEvents: readOnly ? 'none' : 'auto',
        cursor: readOnly ? 'default' : 'col-resize',
        zIndex: 4895,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: -GUIDE_HIT_AREA / 2, width: GUIDE_HIT_AREA, cursor: readOnly ? 'default' : 'col-resize',
      }} />
    </div>
  );
};

// ─── Right-click context menu ─────────────────────────────────────────────

interface GuideContextMenuProps {
  x: number;
  y: number;
  guideId: string;
  filePath: string;
  onClose: () => void;
}

const GuideContextMenu: React.FC<GuideContextMenuProps> = ({ x, y, guideId, filePath, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);
  const handleDelete = () => {
    rulerGuideOps.removeGuide(filePath, guideId);
    onClose();
  };
  return (
    <div
      ref={menuRef}
      data-ruler-guide-menu
      className="fixed py-2 min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border-light)] cut-corners cut-lg cut-border [--cut-border-color:var(--border-light)] shadow-lg"
      style={{ left: x, top: y, zIndex: 99999 }}
    >
      <div
        onClick={handleDelete}
        className="group flex items-center gap-3 mx-1.5 px-2 py-2 cursor-pointer cut-corners hover:bg-[var(--accent)]"
      >
        <span className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-fg)] flex-1">
          Delete Guide
        </span>
        <span className="text-[10px] text-[var(--text-secondary)] group-hover:text-[var(--accent-fg)] ml-8">⌫</span>
      </div>
    </div>
  );
};

// ─── Hook: subscribe to transform manager (same pattern CanvasRulers uses) ─

function useTransform() {
  const [t, setT] = useState(transformManager.getAppliedTransform());
  useEffect(() => transformManager.subscribe(() => setT(transformManager.getAppliedTransform())), []);
  return t;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function RulerGuides({ left, right }: RulerInsets) {
  const store = useStore();
  const showRulers = useAtomValue(showRulersAtom);
  const readOnly = useIsViewer();
  const guides = useAtomValue(activeRulerGuidesAtom);
  const selectedId = useAtomValue(selectedGuideIdAtom);
  // Guides whose id appears here are currently being snapped against —
  // hide them so the pink snap line is unobstructed. They reappear the
  // moment the snap breaks (set drops the id) or the drag/resize ends
  // (set goes empty).
  const snappedIds = useAtomValue(snappedRulerGuideIdsAtom);
  const setSelectedId = useSetAtom(selectedGuideIdAtom);
  const activeFilePath = useAtomValue(activeFilePathAtom);
  const setSelectedNodeIds = useSetAtom(selectedIdsAtom);
  const transform = useTransform();
  // Same dynamic offset rationale as CanvasRulers — see that file.
  // Measured — see use-top-chrome-height.ts for why a path check isn't enough.
  const topOffset = useTopChromeHeight();

  const rulerEdgesRef = useRef({ left, topOffset });
  useEffect(() => { rulerEdgesRef.current = { left, topOffset }; }, [left, topOffset]);
  const dragRef = useRef<{
    guide: RulerGuide;
    filePath: string;
    startCursor: number;
    grabOffset: number;
  } | null>(null);
  const [preview, setPreview] = useState<{ id: string; screenPosition: number } | null>(null);

  // ─── Right-click context menu ──────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<
    { x: number; y: number; guideId: string } | null
  >(null);
  // Close the menu when its target guide gets deselected (Escape, etc.).
  useEffect(() => {
    if (!selectedId && contextMenu) setContextMenu(null);
  }, [selectedId, contextMenu]);

  const handleSelect = useCallback((guideId: string) => {
    setSelectedId(guideId);
    // Clear any node selection — guides + node selection compete for
    // the same selection-overlay highlight color, and Figma exits node
    // selection when you click a guide.
    setSelectedNodeIds([]);
  }, [setSelectedId, setSelectedNodeIds]);

  const handleContextMenu = useCallback((e: React.MouseEvent, guideId: string) => {
    setSelectedId(guideId);
    setContextMenu({ x: e.clientX, y: e.clientY, guideId });
  }, [setSelectedId]);

  const handleStartDrag = (e: React.MouseEvent, guide: RulerGuide, screenPosition: number) => {
    const horizontal = guide.type === 'horizontal';
    const startCursor = horizontal ? e.clientY : e.clientX;
    dragRef.current = { guide, filePath: activeFilePath, startCursor, grabOffset: screenPosition - startCursor };
    document.body.style.cursor = horizontal ? 'row-resize' : 'col-resize';
  };

  const cancelDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setPreview(null);
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (!showRulers || readOnly) return;
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const cursor = drag.guide.type === 'horizontal' ? e.clientY : e.clientX;
      setPreview({ id: drag.guide.id, screenPosition: cursor + drag.grabOffset });
    };
    const onUp = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || e.button !== 0) return;
      cancelDrag();
      if (drag.filePath !== store.get(activeFilePathAtom)) return;
      const horizontal = drag.guide.type === 'horizontal';
      const cursor = horizontal ? e.clientY : e.clientX;
      if (Math.abs(cursor - drag.startCursor) < 2) return;

      const edges = rulerEdgesRef.current;
      const rulerEdge = (horizontal ? edges.topOffset : edges.left) + RULER_SIZE;
      if (cursor - rulerEdge < GUIDE_RULER_THRESHOLD) {
        rulerGuideOps.removeGuide(drag.filePath, drag.guide.id);
        setSelectedId(null);
        return;
      }
      const t = transformManager.getAppliedTransform();
      const position = (cursor + drag.grabOffset - (horizontal ? t.y : t.x)) / t.scale;
      rulerGuideOps.updateGuidePosition(drag.filePath, drag.guide.id, position);
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
  }, [activeFilePath, cancelDrag, readOnly, setSelectedId, showRulers, store]);

  useEffect(() => {
    setSelectedId(null);
    setContextMenu(null);
  }, [activeFilePath, readOnly, setSelectedId, showRulers]);

  // ─── Click-elsewhere to deselect ───────────────────────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't deselect when clicking a guide, ruler, or guide menu —
      // those have their own selection semantics.
      if (target.closest('[data-ruler-guide]')) return;
      if (target.closest('[data-ruler]')) return;
      if (target.closest('[data-ruler-guide-menu]')) return;
      setSelectedId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [setSelectedId]);

  // ─── Keyboard: Backspace/Delete removes, Esc deselects ─────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!showRulers || !selectedId || isViewerMode()) return;
      // Skip when typing in an input / contenteditable / TipTap editor.
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        rulerGuideOps.removeGuide(activeFilePath, selectedId);
        setSelectedId(null);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeFilePath, selectedId, setSelectedId, showRulers]);

  if (!showRulers) return null;

  return (
    <>
      {guides.map((g) => {
        // Hide while the dragged element is locked onto this guide so
        // the pink snap line shows alone (otherwise they overlap and
        // the user can't tell whether the snap fired). See
        // `snappedRulerGuideIdsAtom` in `ruler-guides-store.ts`.
        if (snappedIds.has(g.id)) return null;
        const screenPosition = preview?.id === g.id
          ? preview.screenPosition
          : g.position * transform.scale + (g.type === 'horizontal' ? transform.y : transform.x);
        return (
          <GuideLine
            key={g.id}
            guide={g}
            isSelected={!readOnly && selectedId === g.id}
            readOnly={readOnly}
            screenPosition={screenPosition}
            left={left}
            right={right}
            topOffset={topOffset}
            onSelect={handleSelect}
            onContextMenu={handleContextMenu}
            onStartDrag={handleStartDrag}
          />
        );
      })}
      {!readOnly && contextMenu && (
        <GuideContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          guideId={contextMenu.guideId}
          filePath={activeFilePath}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
