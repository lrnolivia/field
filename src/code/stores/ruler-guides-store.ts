// ruler-guides-store.ts — Atoms + ops for ruler guides.
//
// Source of truth = the active file's `/** @rulerGuides [...] */`
// annotation block (parsed in `ruler-guides-config.ts`). The atoms
// below are read-only derivations of that source — we never store
// guides in atom state separately, so the same guides round-trip
// across reloads + per-file scoping (each page / component / icon-set
// master gets its own list) comes for free.
//
// The UI previews a guide drag locally and writes only the committed edit.

import { atom, getDefaultStore } from 'jotai';
import { activeFilePathAtom } from '@/code/project/active-file-store';
import { projectVersionAtom, projectFS } from '@/code/project/project-fs';
import { modifyProjectFile } from '@/code/project/modify-file';
import { parseRulerGuides, updateRulerGuidesInCode, type RulerGuide } from '@/code/project/ruler-guides-config';
import type { RulerGuideSnapLine } from '@/canvas/drag/handlers/snap-handler';
import { flushNow } from '@/code/mutation/mutation-queue';
import { pushHistoryImmediate, sealPendingHistory } from '@/code/mutation/history';

export type { RulerGuide };

/** Sync read of the active file's ruler guides, projected into the
 *  shape `calculateSnap` consumes (axis = 'x' for vertical / 'y' for
 *  horizontal). Drag/resize handlers call this every frame from the
 *  RAF loop, where reading via `useAtomValue` would force a hook
 *  context. The atom subscription path (`activeRulerGuidesAtom`) stays
 *  the source of truth — this helper just snapshots its current value. */
export function getActiveRulerGuideSnapLines(): RulerGuideSnapLine[] {
  const guides = getDefaultStore().get(activeRulerGuidesAtom);
  if (guides.length === 0) return [];
  return guides.map((g) => ({
    id: g.id,
    axis: g.type === 'vertical' ? 'x' : 'y',
    position: g.position,
  }));
}

// ─── Read atoms ────────────────────────────────────────────────────────────

/** Live ruler-guides for whichever file is currently active. Re-derives
 *  on activeFilePath or projectVersion change — same dependency shape
 *  as `activeCodeAtom` so guide writes (which bump projectVersion via
 *  `modifyProjectFile`) propagate without manual sync. */
export const activeRulerGuidesAtom = atom<RulerGuide[]>((get) => {
  get(projectVersionAtom);
  const filePath = get(activeFilePathAtom);
  const code = projectFS.readFile(filePath);
  if (!code) return [];
  return parseRulerGuides(code);
});

/** Currently selected guide id (visual highlight + delete target).
 *  Session-only — intentionally not persisted; selection always starts
 *  empty when reloading. */
export const selectedGuideIdAtom = atom<string | null>(null);

/** Live drag preview during create-from-ruler. Holds the cursor's
 *  current screen-space position so `CanvasRulers` can render a 1-px
 *  preview line that follows the cursor before the drop commits. */
export const draggingGuidePreviewAtom = atom<
  | { type: 'horizontal' | 'vertical'; screenPosition: number }
  | null
>(null);

/** Set of ruler-guide IDs that are currently being snapped against
 *  (i.e., the dragged/resized element's edge is locked onto them).
 *  `RulerGuides.tsx` hides matching guide lines while their id is in
 *  this set so the pink snap line is visible without the cyan ruler
 *  guide overlapping it. Cleared by `Canvas.tsx`'s wrapper around
 *  `setSnapGuides` whenever the snap-guide list changes. */
export const snappedRulerGuideIdsAtom = atom<Set<string>>(new Set<string>());

// ─── Write ops ─────────────────────────────────────────────────────────────

const generateGuideId = () =>
  `guide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function editGuides(filePath: string, edit: (guides: RulerGuide[]) => RulerGuide[]): void {
  flushNow();
  sealPendingHistory();
  const result = modifyProjectFile(filePath, (code) => {
    const guides = parseRulerGuides(code);
    const next = edit(guides);
    return next === guides ? code : updateRulerGuidesInCode(code, next);
  });
  if (result !== null) pushHistoryImmediate('');
}

export const rulerGuideOps = {
  addGuide(filePath: string, type: 'horizontal' | 'vertical', position: number): void {
    const id = generateGuideId();
    editGuides(filePath, (guides) => [...guides, { id, type, position }]);
  },

  removeGuide(filePath: string, guideId: string): void {
    editGuides(filePath, (guides) => {
      if (!guides.some((guide) => guide.id === guideId)) return guides;
      return guides.filter((guide) => guide.id !== guideId);
    });
  },

  updateGuidePosition(filePath: string, guideId: string, position: number): void {
    editGuides(filePath, (guides) => {
      const index = guides.findIndex((guide) => guide.id === guideId);
      if (index === -1) return guides;
      const next = [...guides];
      next[index] = { ...next[index], position };
      return next;
    });
  },
};
