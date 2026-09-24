// Persist workspace visibility independently of the selected panel/tool.
// The 52px rail always remains available when the left content pane closes.
import { atomWithStorage } from 'jotai/utils';

export const leftPaneOpenAtom = atomWithStorage('revyme:prefs:leftPaneOpen', true, undefined, { getOnInit: true });
export const rightPaneOpenAtom = atomWithStorage('revyme:prefs:rightPaneOpen', true, undefined, { getOnInit: true });

export const LEFT_RAIL_WIDTH = 52;
export const LEFT_CONTENT_WIDTH = 256;
export const RIGHT_PANE_WIDTH = 260;
