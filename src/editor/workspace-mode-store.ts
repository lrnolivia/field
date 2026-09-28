import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import {
  compactInspectorOpenAtom,
  compactDockedLeftOpenAtom,
  compactDockedInspectorOpenAtom,
  rightPaneDragOffsetAtom,
  workspaceModeAtom,
  type WorkspaceMode,
} from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from './detached-left-panel-store';
import { selectedIdsAtom } from '@/code/stores/store';

export { workspaceModeAtom } from '@/code/stores/workspace-panels-store';
export type { WorkspaceMode } from '@/code/stores/workspace-panels-store';

/** The icon rail may tuck away without changing the pane mode. */
export const dockedRailCollapsedAtom = atomWithStorage(
  'field:prefs:dockedRailCollapsed', false, undefined, { getOnInit: true },
);
export const railRevealedAtom = atom(false);
/** Bottom rail controls own this preference. */
export const workspaceAutoHideAtom = atomWithStorage('field:prefs:workspaceAutoHide', true, undefined, { getOnInit: true });
/** Brief, visible entrance after choosing Floating; coordinator ends it after a few seconds. */
export const floatingEntranceAtom = atom(false);
export const floatingLeftHiddenAtom = atom(false);
/** Hides only the left content pane; the floating icon rail stays visible. */
export const floatingPanelCollapsedAtom = atom(false);
export const compactPanelOpenAtom = atom(false);
export const floatingInspectorRevealedAtom = atom(false);
export const floatingInspectorSuppressedAtom = atom(false);
export const floatingInspectorVisibleAtom = atom((get) =>
  get(workspaceModeAtom) !== 'floating' || !get(workspaceAutoHideAtom)
  || (!get(floatingInspectorSuppressedAtom)
    && (get(selectedIdsAtom).length > 0 || get(floatingInspectorRevealedAtom))));
export const leftRailVisibleAtom = atom((get) => {
  const mode = get(workspaceModeAtom);
  if (mode === 'compact' || mode === 'compact-docked') return true;
  if (mode === 'floating') return !get(workspaceAutoHideAtom) || !get(floatingLeftHiddenAtom);
  return !get(dockedRailCollapsedAtom) || get(railRevealedAtom);
});

export const setWorkspaceModeAtom = atom(null, (get, set, mode: WorkspaceMode) => {
  const previousMode = get(workspaceModeAtom);
  const panel = get(leftPanelAtom);
  const floatingPanel = panel === 'vibe' ? 'layers' : panel;
  if (mode === 'floating' && panel === 'vibe') set(leftPanelAtom, floatingPanel);
  set(workspaceModeAtom, mode);
  if (mode === 'floating') set(workspaceAutoHideAtom, true);
  if (mode === 'compact' || mode === 'compact-docked') set(workspaceAutoHideAtom, false);
  set(floatingEntranceAtom, mode === 'floating' && previousMode !== 'floating');
  set(railRevealedAtom, false);
  set(floatingLeftHiddenAtom, false);
  set(floatingPanelCollapsedAtom, false);
  set(compactPanelOpenAtom, false);
  set(compactInspectorOpenAtom, false);
  set(compactDockedLeftOpenAtom, false);
  set(compactDockedInspectorOpenAtom, false);
  set(floatingInspectorRevealedAtom, mode === 'floating' && previousMode !== 'floating');
  set(floatingInspectorSuppressedAtom, false);
  set(rightPaneDragOffsetAtom, { x: 0, y: 0 });
  set(detachedLeftPanelAtom, mode === 'floating'
    ? { panelId: floatingPanel, expanded: true }
    : null);
});
