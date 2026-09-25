// Persist workspace visibility independently of the selected panel/tool.
// field workspace chrome: visibility derives docked / floating / hidden presentation.
import { atomWithStorage } from 'jotai/utils';

export const leftPaneOpenAtom = atomWithStorage('revyme:prefs:leftPaneOpen', true, undefined, { getOnInit: true });
export const rightPaneOpenAtom = atomWithStorage('revyme:prefs:rightPaneOpen', true, undefined, { getOnInit: true });

export const LEFT_RAIL_WIDTH = 52;
export const LEFT_CONTENT_WIDTH = 256;
export const LEFT_WORKSPACE_WIDTH = LEFT_RAIL_WIDTH + LEFT_CONTENT_WIDTH;
export const RIGHT_PANE_WIDTH = 260;
