// image-position-store.ts — the canvas "Position" mode for an image fill.
//
// While set, the selected Frame's background image (or an <img>/<video>
// `object-fit` image) is dragged directly on the canvas inside its fixed
// box; the Frame itself does not move. See ImagePositionOverlay.

import { atom } from 'jotai';

export interface ImagePositionTarget {
  nodeId: string;
  vpId: string;
}

export const imagePositionTargetAtom = atom<ImagePositionTarget | null>(null);
