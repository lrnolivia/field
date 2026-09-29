// Persist workspace visibility and pane widths independently of the selected panel/tool.
// field workspace chrome: visibility derives docked / floating / hidden presentation.
import { atomWithStorage } from 'jotai/utils';
import { atom } from 'jotai';

// The layout preset and docked pane states persist independently. Selecting a
// preset seeds the panes; restoring it must not overwrite later pane changes.
export type WorkspaceMode = 'docked' | 'floating' | 'compact' | 'compact-docked';
export const workspaceModeAtom = atomWithStorage<WorkspaceMode>('field:prefs:workspaceMode', 'docked', undefined, { getOnInit: true });
export const dockedLeftOpenAtom = atomWithStorage('field:prefs:dockedLeftOpen:v1', true, undefined, { getOnInit: true });
export const dockedInspectorOpenAtom = atomWithStorage('field:prefs:dockedInspectorOpen:v1', true, undefined, { getOnInit: true });
/** Auto-hide is independent of the left rail and of the layout preset. */
export const rightInspectorAutoHideAtom = atomWithStorage('field:prefs:rightInspectorAutoHide:v1', false, undefined, { getOnInit: true });
export const rightInspectorTemporaryRevealAtom = atom(false);
/** An explicit Collapse wins over selection-driven temporary reveal. */
export const rightInspectorExplicitCollapseAtom = atom(false);
/** Temporary Inspector reveal in Compact; never changes the workspace mode. */
export const compactInspectorOpenAtom = atom(false);
/** Explicitly pinned floating Inspector expansion. */
export const floatingInspectorExpandedAtom = atom(false);
export const leftPaneOpenAtom = atom(
  (get) => {
    const mode = get(workspaceModeAtom);
    if (mode === 'docked' || mode === 'compact-docked') return get(dockedLeftOpenAtom);
    return false;
  },
  (get, set, open: boolean) => {
    const mode = get(workspaceModeAtom);
    if (mode === 'docked' || mode === 'compact-docked') { set(dockedLeftOpenAtom, open); return; }
    if (mode === 'compact') set(workspaceModeAtom, open ? 'docked' : 'compact');
  },
);
export const rightPaneOpenAtom = atom(
  (get) => {
    const mode = get(workspaceModeAtom);
    const temporary = !get(rightInspectorExplicitCollapseAtom) && get(rightInspectorTemporaryRevealAtom);
    if (mode === 'docked' || mode === 'compact-docked') return get(dockedInspectorOpenAtom) || temporary;
    if (mode === 'floating') return get(floatingInspectorExpandedAtom) || temporary;
    if (mode === 'compact') return get(compactInspectorOpenAtom) || temporary;
    return false;
  },
  (get, set, open: boolean) => {
    const mode = get(workspaceModeAtom);
    set(rightInspectorTemporaryRevealAtom, false);
    set(rightInspectorExplicitCollapseAtom, !open);
    // A deliberate expand pins the pane; a deliberate collapse cannot be
    // undone by hover or the still-selected object under the pointer.
    set(rightInspectorAutoHideAtom, false);
    if (mode === 'docked' || mode === 'compact-docked') { set(dockedInspectorOpenAtom, open); return; }
    if (mode === 'floating') { set(floatingInspectorExpandedAtom, open); return; }
    if (mode === 'compact') { set(compactInspectorOpenAtom, open); return; }
  },
);
export const rightPaneDetachedAtom = atom(
  (get) => get(workspaceModeAtom) === 'floating' || (get(workspaceModeAtom) === 'compact' && get(compactInspectorOpenAtom)),
  (_get, set, detached: boolean) => set(workspaceModeAtom, detached ? 'floating' : 'docked'),
);
export const rightPaneDragOffsetAtom = atom({ x: 0, y: 0 });
export const rightFloatingHeightAtom = atomWithStorage('field:prefs:rightFloatingHeight', 680, undefined, { getOnInit: true });
export const floatingLeftHeightAtom = atomWithStorage('field:prefs:floatingLeftHeight', 680, undefined, { getOnInit: true });
export const leftCollapsedWidthAtom = atomWithStorage('field:prefs:leftCollapsedWidth', 52, undefined, { getOnInit: true });
export const rightCollapsedWidthAtom = atomWithStorage('field:prefs:rightCollapsedWidth', 60, undefined, { getOnInit: true });

/** Prevents accidental horizontal pane resizing from the editor drag handles.
 *  Settings can still intentionally apply a width preset while locked. */
export const workspacePanelWidthsLockedAtom = atomWithStorage(
  'field:prefs:workspacePanelWidthsLocked:v1',
  false,
  undefined,
  { getOnInit: true },
);

export const LEFT_RAIL_WIDTH = 52;
export const DEFAULT_LEFT_CONTENT_WIDTH = 256;
export const DEFAULT_RIGHT_PANE_WIDTH = 328;
export const MIN_LEFT_CONTENT_WIDTH = 220;
export const MAX_LEFT_CONTENT_WIDTH = 420;
export const MIN_RIGHT_PANE_WIDTH = 300;
export const MAX_RIGHT_PANE_WIDTH = 480;

export type WorkspacePanelWidthPresetId = 'compact' | 'balanced' | 'roomy';

export interface WorkspacePanelWidthPreset {
  id: WorkspacePanelWidthPresetId;
  label: string;
  description: string;
  left: number;
  right: number;
}

export const WORKSPACE_PANEL_WIDTH_PRESETS: readonly WorkspacePanelWidthPreset[] = [
  { id: 'compact', label: 'Compact', description: 'More room for Canvas', left: 232, right: 300 },
  { id: 'balanced', label: 'Balanced', description: 'field defaults', left: 256, right: 328 },
  { id: 'roomy', label: 'Roomy', description: 'More panel breathing room', left: 320, right: 380 },
] as const;

export function getWorkspacePanelWidthPresetId(
  left: number,
  right: number,
): WorkspacePanelWidthPresetId | null {
  const preset = WORKSPACE_PANEL_WIDTH_PRESETS.find((item) => item.left === left && item.right === right);
  return preset?.id ?? null;
}

export function clampLeftContentWidth(width: number): number {
  return Math.min(MAX_LEFT_CONTENT_WIDTH, Math.max(MIN_LEFT_CONTENT_WIDTH, Math.round(width)));
}

export function clampRightPaneWidth(width: number): number {
  return Math.min(MAX_RIGHT_PANE_WIDTH, Math.max(MIN_RIGHT_PANE_WIDTH, Math.round(width)));
}

export const leftContentWidthAtom = atomWithStorage(
  'field:prefs:leftContentWidth',
  DEFAULT_LEFT_CONTENT_WIDTH,
  undefined,
  { getOnInit: true },
);

export const rightPaneWidthAtom = atomWithStorage(
  'field:prefs:rightPaneWidth:v2',
  DEFAULT_RIGHT_PANE_WIDTH,
  undefined,
  { getOnInit: true },
);

// Compatibility constants for code that needs the default geometry rather than
// the live user preference. Rendering/camera code should use the width atoms.
export const LEFT_CONTENT_WIDTH = DEFAULT_LEFT_CONTENT_WIDTH;
export const LEFT_WORKSPACE_WIDTH = LEFT_RAIL_WIDTH + DEFAULT_LEFT_CONTENT_WIDTH;
export const RIGHT_PANE_WIDTH = DEFAULT_RIGHT_PANE_WIDTH;
