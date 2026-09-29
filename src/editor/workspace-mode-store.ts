import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import {
  compactInspectorOpenAtom,
  floatingInspectorExpandedAtom,
  dockedLeftOpenAtom,
  dockedInspectorOpenAtom,
  rightInspectorAutoHideAtom,
  rightInspectorTemporaryRevealAtom,
  rightInspectorExplicitCollapseAtom,
  rightPaneOpenAtom,
  rightPaneDragOffsetAtom,
  workspaceModeAtom,
  type WorkspaceMode,
} from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from './detached-left-panel-store';

export { workspaceModeAtom } from '@/code/stores/workspace-panels-store';
export type { WorkspaceMode } from '@/code/stores/workspace-panels-store';

/** The icon rail may tuck away without changing the pane mode. */
export const dockedRailCollapsedAtom = atomWithStorage(
  'field:prefs:dockedRailCollapsed', false, undefined, { getOnInit: true },
);
export const railRevealedAtom = atom(false);
/** Bottom rail controls own this preference. */
export const workspaceAutoHideAtom = atomWithStorage('field:prefs:workspaceAutoHide:v2', false, undefined, { getOnInit: true });
/** Brief, visible entrance after choosing Floating; coordinator ends it after a few seconds. */
export const floatingEntranceAtom = atom(false);
export const floatingLeftHiddenAtom = atom(false);
/** Hides only the left content pane; the floating icon rail stays visible. */
export const floatingPanelCollapsedAtom = atom(true);
export const compactPanelOpenAtom = atom(false);
export const floatingInspectorRevealedAtom = atom(false);
export const floatingInspectorSuppressedAtom = atom(false);
export const floatingInspectorVisibleAtom = atom((get) => {
  if (!get(rightInspectorAutoHideAtom)) return true;
  return !get(floatingInspectorSuppressedAtom)
    && (get(rightPaneOpenAtom) || get(rightInspectorTemporaryRevealAtom));
});
export const leftRailVisibleAtom = atom((get) => {
  const mode = get(workspaceModeAtom);
  if (mode === 'compact') return true;
  if (mode === 'docked' || mode === 'floating' || mode === 'compact-docked') {
    return !get(workspaceAutoHideAtom) || !get(floatingLeftHiddenAtom);
  }
  return true;
});

export const setWorkspaceModeAtom = atom(null, (get, set, mode: WorkspaceMode) => {
  const previousMode = get(workspaceModeAtom);
  const panel = get(leftPanelAtom);
  const floatingPanel = panel === 'vibe' ? 'layers' : panel;
  if (mode === 'floating' && panel === 'vibe') set(leftPanelAtom, floatingPanel);
  set(workspaceModeAtom, mode);
  if (mode === 'docked' || mode === 'compact-docked') {
    const expanded = mode === 'docked';
    set(dockedLeftOpenAtom, expanded);
    set(dockedInspectorOpenAtom, expanded);
  }
  set(rightInspectorAutoHideAtom, false);
  set(rightInspectorTemporaryRevealAtom, false);
  set(rightInspectorExplicitCollapseAtom, false);
  set(floatingEntranceAtom, mode === 'floating' && previousMode !== 'floating');
  set(railRevealedAtom, false);
  set(floatingLeftHiddenAtom, false);
  set(floatingPanelCollapsedAtom, mode === 'floating');
  set(floatingInspectorExpandedAtom, false);
  set(compactPanelOpenAtom, false);
  set(compactInspectorOpenAtom, false);
  set(floatingInspectorRevealedAtom, false);
  set(floatingInspectorSuppressedAtom, false);
  set(rightPaneDragOffsetAtom, { x: 0, y: 0 });
  set(detachedLeftPanelAtom, mode === 'floating'
    ? { panelId: floatingPanel, expanded: false }
    : null);
});
