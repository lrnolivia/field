// Persist workspace visibility and pane widths independently of the selected panel/tool.
// field workspace chrome: visibility derives docked / floating / hidden presentation.
import { atomWithStorage } from 'jotai/utils';

export const leftPaneOpenAtom = atomWithStorage('revyme:prefs:leftPaneOpen', true, undefined, { getOnInit: true });
export const rightPaneOpenAtom = atomWithStorage('revyme:prefs:rightPaneOpen', true, undefined, { getOnInit: true });

export const LEFT_RAIL_WIDTH = 52;
export const DEFAULT_LEFT_CONTENT_WIDTH = 256;
export const DEFAULT_RIGHT_PANE_WIDTH = 260;
export const MIN_LEFT_CONTENT_WIDTH = 220;
export const MAX_LEFT_CONTENT_WIDTH = 420;
export const MIN_RIGHT_PANE_WIDTH = 240;
export const MAX_RIGHT_PANE_WIDTH = 420;

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
  'field:prefs:rightPaneWidth',
  DEFAULT_RIGHT_PANE_WIDTH,
  undefined,
  { getOnInit: true },
);

// Compatibility constants for code that needs the default geometry rather than
// the live user preference. Rendering/camera code should use the width atoms.
export const LEFT_CONTENT_WIDTH = DEFAULT_LEFT_CONTENT_WIDTH;
export const LEFT_WORKSPACE_WIDTH = LEFT_RAIL_WIDTH + DEFAULT_LEFT_CONTENT_WIDTH;
export const RIGHT_PANE_WIDTH = DEFAULT_RIGHT_PANE_WIDTH;
