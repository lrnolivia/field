import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import {
  compactInspectorOpenAtom,
  rightPaneDragOffsetAtom,
  workspaceModeAtom,
  type WorkspaceMode,
} from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from './detached-left-panel-store';
import { selectedIdsAtom } from '@/code/stores/store';

export { workspaceModeAtom } from '@/code/stores/workspace-panels-store';
export type { WorkspaceMode } from '@/code/stores/workspace-panels-store';

/** The icon rail may tuck away without changing the three pane modes. */
export const dockedRailCollapsedAtom = atomWithStorage(
  'field:prefs:dockedRailCollapsed', false, undefined, { getOnInit: true },
);
export const railRevealedAtom = atom(false);
/** The title pill owns this preference in every mode. */
export const workspaceAutoHideAtom = atomWithStorage('field:prefs:workspaceAutoHide', true, undefined, { getOnInit: true });
export const floatingLeftHiddenAtom = atom(false);
export const compactPanelOpenAtom = atom(false);
export const floatingInspectorRevealedAtom = atom(false);
export const floatingInspectorSuppressedAtom = atom(false);
export const floatingInspectorVisibleAtom = atom((get) =>
  get(workspaceModeAtom) !== 'floating' || !get(workspaceAutoHideAtom)
  || (!get(floatingInspectorSuppressedAtom)
    && (get(selectedIdsAtom).length > 0 || get(floatingInspectorRevealedAtom))));
export const leftRailVisibleAtom = atom((get) => {
  const mode = get(workspaceModeAtom);
  if (mode === 'compact') return get(railRevealedAtom);
  if (mode === 'floating') return !get(workspaceAutoHideAtom) || !get(floatingLeftHiddenAtom);
  return !get(dockedRailCollapsedAtom) || get(railRevealedAtom);
});

export const setWorkspaceModeAtom = atom(null, (get, set, mode: WorkspaceMode) => {
  const panel = get(leftPanelAtom);
  const floatingPanel = panel === 'vibe' ? 'layers' : panel;
  if (mode === 'floating' && panel === 'vibe') set(leftPanelAtom, floatingPanel);
  set(workspaceModeAtom, mode);
  set(railRevealedAtom, false);
  set(floatingLeftHiddenAtom, false);
  set(compactPanelOpenAtom, false);
  set(compactInspectorOpenAtom, false);
  set(floatingInspectorRevealedAtom, false);
  set(floatingInspectorSuppressedAtom, false);
  set(rightPaneDragOffsetAtom, { x: 0, y: 0 });
  set(detachedLeftPanelAtom, mode === 'floating'
    ? { panelId: floatingPanel, expanded: true }
    : null);
});
