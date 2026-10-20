/**
 * Multi-selection resize — ONE shared affine for every selected member.
 *
 * Dragging a handle of the selection's bounding box scales the box about its
 * opposite edge/corner. Every member is mapped through that same map: its
 * centre moves to `A + (c - A) * s` and its box scales by the same `sx/sy`.
 * Sizing each member by its own fraction of the largest member (the old
 * behaviour) left positions behind and overshot small members, so the
 * selection no longer matched its own bounding box.
 *
 * Positions are mapped through the member CENTRE, so a rotated member (CSS
 * rotation pivots at its centre by default) stays rigidly placed too. All
 * screen-space inputs are divided by the camera scale to produce local px.
 */
import type { Direction } from './geometry-utils';
import { getHandlesFromDirection } from './geometry-utils';

export interface SelectionResizeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionResizeMember {
  /** Local CSS box in px (computed left/top/width/height). */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Painted centre in the same screen space as the selection box. */
  screenCenter: { x: number; y: number };
}

export interface SelectionResizeResult {
  sx: number;
  sy: number;
  box: SelectionResizeBox;
  members: Array<{ left: number; top: number; width: number; height: number }>;
}

const MIN_BOX = 1;

export function planSelectionResize(args: {
  startBox: SelectionResizeBox;
  direction: Direction;
  /** Total pointer movement since gesture start, in screen px. */
  dx: number;
  dy: number;
  /** Shift on a corner keeps the selection's starting ratio. */
  keepRatio: boolean;
  /** Camera scale (screen px per local px). */
  scale: number;
  members: SelectionResizeMember[];
}): SelectionResizeResult | null {
  const { startBox, direction, dx, dy, keepRatio, members } = args;
  const scale = args.scale > 0 ? args.scale : 1;
  if (!(startBox.width > 0) || !(startBox.height > 0)) return null;
  const { xHandle, yHandle } = getHandlesFromDirection(direction);

  let width = startBox.width + (xHandle === 'right' ? dx : xHandle === 'left' ? -dx : 0);
  let height = startBox.height + (yHandle === 'bottom' ? dy : yHandle === 'top' ? -dy : 0);
  width = Math.max(MIN_BOX, width);
  height = Math.max(MIN_BOX, height);

  let sx = width / startBox.width;
  let sy = height / startBox.height;
  if (keepRatio && xHandle && yHandle) {
    const s = Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy;
    sx = s;
    sy = s;
    width = startBox.width * s;
    height = startBox.height * s;
  }

  // Anchor = the edge/corner opposite the dragged handle. An untouched axis
  // keeps scale 1, so its anchor value is irrelevant.
  const ax = xHandle === 'left' ? startBox.x + startBox.width : startBox.x;
  const ay = yHandle === 'top' ? startBox.y + startBox.height : startBox.y;
  const box: SelectionResizeBox = {
    x: ax + (startBox.x - ax) * sx,
    y: ay + (startBox.y - ay) * sy,
    width,
    height,
  };

  const planned = members.map((m) => {
    const nextCx = ax + (m.screenCenter.x - ax) * sx;
    const nextCy = ay + (m.screenCenter.y - ay) * sy;
    const nextWidth = Math.max(MIN_BOX, m.width * sx);
    const nextHeight = Math.max(MIN_BOX, m.height * sy);
    return {
      left: m.left + (nextCx - m.screenCenter.x) / scale - (nextWidth - m.width) / 2,
      top: m.top + (nextCy - m.screenCenter.y) / scale - (nextHeight - m.height) / 2,
      width: nextWidth,
      height: nextHeight,
    };
  });

  return { sx, sy, box, members: planned };
}
