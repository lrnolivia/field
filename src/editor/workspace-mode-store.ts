import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import {
  leftPaneOpenAtom,
  rightPaneOpenAtom,
  rightPaneDetachedAtom,
  rightPaneDragOffsetAtom,
} from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from './detached-left-panel-store';

export type WorkspaceMode = 'docked' | 'floating' | 'compact';

/** One saved mode owns both sides of the editor chrome. */
export const workspaceModeAtom = atomWithStorage<WorkspaceMode>(
  'field:prefs:workspaceMode', 'docked', undefined, { getOnInit: true },
);

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
  set(workspaceModeAtom, mode);
  set(railRevealedAtom, false);
  set(leftPaneOpenAtom, mode === 'docked');
  set(rightPaneOpenAtom, mode !== 'compact');
  set(rightPaneDetachedAtom, mode === 'floating');
  set(rightPaneDragOffsetAtom, { x: 0, y: 0 });
  set(detachedLeftPanelAtom, mode === 'floating'
    ? { panelId: panel === 'vibe' ? 'layers' : panel, expanded: true }
    : null);
});
