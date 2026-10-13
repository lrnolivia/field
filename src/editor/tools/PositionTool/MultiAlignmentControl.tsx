// MultiAlignmentControl.tsx — Position-section alignment for a MULTI-SELECTION.
//
// When several nodes are selected the single-node PositionTool is hidden (its
// pin/coords/type controls can't generalize across a heterogeneous group), but
// the user still needs the 6 alignment icons to line the selection up. This
// control renders just the "Position" section header + the shared
// `AlignmentButtons`, wired to the group-bbox math in `multi-align.ts`.
//
// Icons enable only when EVERY selected node is absolutely / fixed positioned —
// the only case where writing left/top actually moves the element. For
// static/relative flow children, left/top is a no-op (or an unexpected offset),
// so we gray the icons out rather than silently doing nothing.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { ToolSection, ToolDivider } from '../../controls';
import { AlignmentButtons } from './AlignmentControl';
import { calculateDistributeSpacing, calculateMultiAlign, type AlignRect, type AlignDelta } from './multi-align';
import ToolPopup from '../../ui/ToolPopup';
import type { AlignDirection } from '@/shared/pin-utils';
import {
  getContentRoot,
  findNodeRect,
  findNodeComputedStyle,
  updateNodeStyles,
} from '@/canvas/node-ops';
import { transformManager } from '@/canvas/transform';
import { selectedIdsAtom } from '@/code/stores/store';
import { trace } from '@/shared/debug-trace';

interface Props {
  vpId: string;
}

export default function MultiAlignmentControl({ vpId }: Props) {
  const selectedIds = useAtomValue(selectedIdsAtom);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  // Enabled only when every selected node is absolutely / fixed positioned.
  // `position` resolves to a real value through the bridge computed cache.
  const enabled = useMemo(() => {
    if (selectedIds.length < 2) return false;
    return selectedIds.every(id => {
      const pos = findNodeComputedStyle(id, vpId, 'position');
      return pos === 'absolute' || pos === 'fixed';
    });
  }, [selectedIds, vpId]);

  const applyPositionDeltas = useCallback((calculate: (rects: AlignRect[]) => Map<string, AlignDelta>, action: string) => {
    if (!enabled) return;
    const contentEl = getContentRoot();
    if (!contentEl) return;

    // Collect screen-space rects (scaled by zoom) for every selected node.
    // The bbox math runs in screen space; deltas convert back to CSS px by
    // dividing once by the current canvas scale.
    const scale = transformManager.getTransform().scale || 1;
    const rects: AlignRect[] = [];
    for (const id of selectedIds) {
      const r = findNodeRect(id, vpId);
      if (!r) continue;
      rects.push({ id, left: r.left, top: r.top, width: r.width, height: r.height });
    }
    if (rects.length < 2) return;

    const deltas = calculate(rects);
    trace.action('multi-align:apply', { action, count: rects.length });

    for (const id of selectedIds) {
      const d = deltas.get(id);
      if (!d) continue;
      // computed left/top resolve to px (the used value) for positioned
      // elements even when authored via right/bottom. Add the screen-space
      // delta (in CSS px) and anchor to left/top, clearing the opposite side
      // so an inset pair doesn't get stretched by the new value.
      const styles: Record<string, string> = {};
      if (d.dx !== undefined) {
        const curLeft = parseFloat(findNodeComputedStyle(id, vpId, 'left'));
        const base = isNaN(curLeft) ? 0 : curLeft;
        styles.left = `${Math.round(base + d.dx / scale)}px`;
        styles.right = '';
      }
      if (d.dy !== undefined) {
        const curTop = parseFloat(findNodeComputedStyle(id, vpId, 'top'));
        const base = isNaN(curTop) ? 0 : curTop;
        styles.top = `${Math.round(base + d.dy / scale)}px`;
        styles.bottom = '';
      }
      updateNodeStyles({ id, styles, contentEl });
    }
  }, [enabled, selectedIds, vpId]);

  const handleAlign = useCallback((dir: AlignDirection) => {
    applyPositionDeltas((rects) => calculateMultiAlign(dir, rects), dir);
  }, [applyPositionDeltas]);

  const handleDistribute = (axis: 'horizontal' | 'vertical') => {
    applyPositionDeltas((rects) => calculateDistributeSpacing(axis, rects), `distribute-${axis}`);
    setMoreOpen(false);
  };

  return (
    <>
      <ToolSection title="Position" action={<>
        <button ref={moreRef} type="button" title="More position actions" aria-label="More position actions"
          onClick={() => setMoreOpen((value) => !value)}
          className="flex h-7 w-7 items-center justify-center rounded-[5px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" /><rect x="6" y="6" width="4" height="4" rx=".7" /></svg>
        </button>
        <ToolPopup isOpen={moreOpen} onClose={() => setMoreOpen(false)} anchorRef={moreRef} title="More position actions" width={260}>
          <div className="flex flex-col p-1.5 text-xs">
            <button type="button" disabled title="Tidy up is not available yet" className="rounded px-2 py-2 text-left text-[var(--text-disabled)] cursor-not-allowed">Tidy up</button>
            <button type="button" disabled={!enabled || selectedIds.length < 3} onClick={() => handleDistribute('vertical')} className="rounded px-2 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:text-[var(--text-disabled)] disabled:cursor-not-allowed">Distribute vertical spacing</button>
            <button type="button" disabled={!enabled || selectedIds.length < 3} onClick={() => handleDistribute('horizontal')} className="rounded px-2 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:text-[var(--text-disabled)] disabled:cursor-not-allowed">Distribute horizontal spacing</button>
          </div>
        </ToolPopup>
      </>}>
        <AlignmentButtons enabled={enabled} onAlign={handleAlign} />
      </ToolSection>
      <ToolDivider />
    </>
  );
}
