// left-panel-store.ts — Jotai atoms for WHERE THE USER IS in the editor chrome:
// which left panel is open, and whether a full-screen overlay is covering the
// canvas. Selection and workspace visibility are separate: the selected
// panel remains available when the content pane is collapsed.

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { trace } from '@/shared/debug-trace';
import { leftPaneOpenAtom } from './workspace-panels-store';

export type LeftPanelId =
  | 'insert'
  | 'pages-layers'  // Legacy alias for the persistent Pages + Layers document
                    // panel. Kept for saved state / older deep links.
  | 'layers'        // Canonical id for the persistent document panel.
  | 'library'
  | 'presets'
  | 'media'
  | 'locale'
  | 'cms'
  | 'branches'     // Branch workspaces: create / switch / review / apply.
  | 'vibe';         // VIBE AI chat (docked). Has no PANEL_MAP entry — the chat
                    // component renders its own self-positioned panel overlay
                    // when this is active. See LeftPanel.tsx / VibeDockShell.

/** The HOME panel: the persistent document panel (Pages above Layers).
 *  Keep the canonical id as 'layers' so existing shortcuts and restored state
 *  continue to converge on the same document-navigation surface. */
export const DEFAULT_LEFT_PANEL: LeftPanelId = 'layers';

/** Which left panel is currently open. Never null. */
export const leftPanelAtom = atomWithStorage<LeftPanelId>('field:prefs:leftLastPanel', DEFAULT_LEFT_PANEL, undefined, { getOnInit: true });

/** Whether the floating code editor popup is open. */
export const codeEditorOpenAtom = atom(false);
/** A file the code editor should show next time it renders (e.g. "Edit Code"
 *  on a code override). The editor consumes it and resets it to null. */
export const codeEditorViewRequestAtom = atom<string | null>(null);

/** Rail click: select a panel, reopen the content pane, or collapse the
 *  active pane. If restored state still uses the legacy 'pages-layers' id,
 *  clicking the canonical rail item normalizes it back to 'layers'. */
export const togglePanelAtom = atom(
  (get) => get(leftPanelAtom),
  (get, set, panelId: LeftPanelId) => {
    const current = get(leftPanelAtom);
    const open = get(leftPaneOpenAtom);
    const next = panelId === 'layers' && current === 'pages-layers' ? 'layers' : panelId;
    const nextOpen = !open || current !== next;
    trace.action('left-panel:toggle', { from: current, to: next, open: nextOpen });
    set(leftPanelAtom, next);
    set(leftPaneOpenAtom, nextOpen);
  },
);

/** Manage Translations overlay open?
 *
 *  Write-through: OPENING also selects the locale panel in the left menu — the
 *  overlay may only exist while the globe is the active panel (CMS-panel
 *  parity; App.tsx closes it when the panel changes away), so openers from
 *  elsewhere (LocalePropPill, LocaleStylePopup) must carry the panel along or
 *  the close-on-switch effect would immediately dismiss them.
 *
 *  Lives HERE rather than in LocalePanel.tsx because undo/redo restore it (see
 *  `UiLocation` in mutation/history.ts), and the canvas may not import an
 *  editor panel component to read one atom. */
const _translationsOverlayOpenAtom = atom(false);
export const translationsOverlayOpenAtom = atom(
  (get) => get(_translationsOverlayOpenAtom),
  (get, set, open: boolean) => {
    set(_translationsOverlayOpenAtom, open);
    if (open) set(leftPanelAtom, 'locale');
    trace.action('locale:translations-overlay', { open });
  },
);
