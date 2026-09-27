import { atom } from 'jotai';

export interface SelectionColorLocateRequest {
  nodeIds: string[];
  tint: string | null;
  mode: 'hover' | 'click';
  revision: number;
}

/** Transient UI signal. This never changes the actual selection or document. */
export const selectionColorLocateAtom = atom<SelectionColorLocateRequest | null>(null);

let revision = 0;
export function locateSelectionColor(nodeIds: string[], tint: string | null, mode: 'hover' | 'click'): SelectionColorLocateRequest {
  return { nodeIds: [...new Set(nodeIds)], tint, mode, revision: ++revision };
}
