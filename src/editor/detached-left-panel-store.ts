import { atom } from 'jotai';
import type { LeftPanelId } from '@/code/stores/left-panel-store';

export interface DetachedLeftPanel {
  panelId: LeftPanelId;
  expanded: boolean;
}

export const detachedLeftPanelAtom = atom<DetachedLeftPanel | null>(null);
