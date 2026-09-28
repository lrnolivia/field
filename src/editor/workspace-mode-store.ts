import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import {
  rightPaneDragOffsetAtom,
  workspaceModeAtom,
  type WorkspaceMode,
} from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from './detached-left-panel-store';

export { workspaceModeAtom } from '@/code/stores/workspace-panels-store';
export type { WorkspaceMode } from '@/code/stores/workspace-panels-store';

/** The icon rail may tuck away without changing the three pane modes. */
export const dockedRailCollapsedAtom = atomWithStorage(
  'field:prefs:dockedRailCollapsed', false, undefined, { getOnInit: true },
);
export const railRevealedAtom = atom(false);
export const leftRailVisibleAtom = atom((get) => {
  const mode = get(workspaceModeAtom);
  return mode === 'compact' || get(railRevealedAtom)
    || (mode === 'docked' && !get(dockedRailCollapsedAtom));
});

export const setWorkspaceModeAtom = atom(null, (get, set, mode: WorkspaceMode) => {
  const panel = get(leftPanelAtom);
  const floatingPanel = panel === 'vibe' ? 'layers' : panel;
  if (mode === 'floating' && panel === 'vibe') set(leftPanelAtom, floatingPanel);
  set(workspaceModeAtom, mode);
  set(railRevealedAtom, false);
  set(rightPaneDragOffsetAtom, { x: 0, y: 0 });
  set(detachedLeftPanelAtom, mode === 'floating'
    ? { panelId: floatingPanel, expanded: true }
    : null);
});
