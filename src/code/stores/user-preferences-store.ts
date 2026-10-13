// user-preferences-store.ts — Editor preferences that persist across
// reloads. Stored in localStorage under `Revyme:prefs:<key>` so they
// survive page refresh + project switch (preferences are per-USER, not
// per-project).
//
// Mirrors the larger builder-side preferences store
// (`builder/src/builder/context/atoms/user-preferences-store.ts`) but
// keeps things minimal — these atoms only define WHAT prefs exist; the
// File → Preferences submenu reads/writes them. Wiring each pref to its
// downstream behavior (auto-pan speed → DragCoordinator, rulers, zoom, etc.)
// is per-feature work done as each toggle gets connected to a real consumer.

import { atomWithStorage } from 'jotai/utils';
import type { EditorNeutralLevel, EditorThemeMode } from '@/shared/editor-neutral-theme';

// ─── Types ─────────────────────────────────────────────────────────────────

export type AutoPanSpeed = 'low' | 'mid' | 'high';

interface AutoPanSpeedValues {
  /** Canvas pan velocity (px/frame) when the cursor is FULLY into a
   *  side panel — i.e., the ramp's MAX. */
  maxScrollSpeed: number;
  /** Canvas pan velocity (px/frame) at 1 px past the canvas boundary
   *  — i.e., the ramp's floor. */
  minScrollSpeed: number;
}

/** Numeric values consumed by `computeAutoPanDelta` in `AutoPan.ts`.
 *  `mid` preserves the Revyme default before this pref was wired
 *  (the legacy `AUTOPAN_MIN_SPEED = 0.4` / `AUTOPAN_MAX_SPEED = 3.2`
 *  in `transform/constants.ts`). `low` is ~half mid, `high` is ~2x —
 *  noticeably different feel without the panel-edge ramp going so fast
 *  the user overshoots their target. */
export const AUTO_PAN_SPEED_VALUES: Record<AutoPanSpeed, AutoPanSpeedValues> = {
  low:  { maxScrollSpeed: 1.5, minScrollSpeed: 0.3 },
  mid:  { maxScrollSpeed: 3.2, minScrollSpeed: 0.4 },
  high: { maxScrollSpeed: 6.5, minScrollSpeed: 0.7 },
};

// ─── Atoms ─────────────────────────────────────────────────────────────────
// Each `atomWithStorage` reads from localStorage on first access and
// writes back on every set. Keys are namespaced under `Revyme:prefs:`
// so they don't collide with other per-user state in the same origin.

/** Auto-pan speed for edge scrolling during drag. */
export const autoPanSpeedAtom = atomWithStorage<AutoPanSpeed>(
  'revyme:prefs:autoPanSpeed', 'mid',
);

/** Auto focus layers: when ON, selecting a node also opens the
 *  Pages & Layers panel and scrolls the matching layer into view. */
export const autoFocusLayersAtom = atomWithStorage<boolean>(
  'revyme:prefs:autoFocusLayers', false,
);

/** Show rulers: when ON, horizontal + vertical rulers render along
 *  the canvas edges with px-tick marks. */
export const showRulersAtom = atomWithStorage<boolean>(
  'revyme:prefs:showRulers', false,
);

/** Use smooth zoom: when ON, scroll-wheel + Ctrl+= / Ctrl+- zoom
 *  operations animate to the target scale instead of snapping. */
export const useSmoothZoomAtom = atomWithStorage<boolean>(
  'revyme:prefs:useSmoothZoom', true,
);

/** Show pixel grid: when ON and zoom > 500%, faint 1px grid lines
 *  appear on the canvas to help with pixel-level alignment. */
export const showPixelGridAtom = atomWithStorage<boolean>(
  'revyme:prefs:showPixelGrid', true,
);

/** Builder accent theme id — recolours the EDITOR chrome (`--accent` and
 *  friends in `src/styles/globals.css`), not the user's project tokens.
 *  Palettes live in `shared/builder-themes.ts`; the DOM write + light/dark
 *  re-paint live in `editor/builder-theme.ts`, which subscribes to this. */
export const builderThemeAtom = atomWithStorage<string>(
  'revyme:prefs:builderTheme', 'monochrome',
);

/** Editor chrome mode; independent from the builder accent palette and from the website preview. */
export const editorThemeModeAtom = atomWithStorage<EditorThemeMode>(
  'revyme:prefs:themeMode', 'dark',
);

/** Website appearance shown in Canvas + Preview.
 *  This is a per-user viewing preference only: it never rewrites project source
 *  or the published site's own theme/default behavior. */
export const websitePreviewThemeAtom = atomWithStorage<EditorThemeMode>(
  'field:prefs:websitePreviewTheme', 'light', undefined, { getOnInit: true },
);

/** Five neutral chrome levels per Light/Dark mode. Level 3 is Default. */
export const editorNeutralLevelAtom = atomWithStorage<EditorNeutralLevel>(
  'revyme:prefs:neutralLevel', '3',
);

/** Editor-only loew.fi case management for eligible field chrome.
 *  ON by default. Turning it off leaves authored UI casing untouched.
 *  The legacy storage key is retained so the preference survives the
 *  expansion from headings to menus, buttons, tooltips, tabs, and labels. */
export const caseManagementAtom = atomWithStorage<boolean>(
  'field:prefs:lowercaseHeadings', true, undefined, { getOnInit: true },
);

/** Compatibility alias for heading-only callsites while they migrate. */
export const lowercaseHeadingsAtom = caseManagementAtom;
