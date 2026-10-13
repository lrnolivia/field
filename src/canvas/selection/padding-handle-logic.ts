import { writePaddingSides, type PaddingSides } from '@/editor/tools/layout-padding';

export type PaddingSide = 'top' | 'right' | 'bottom' | 'left';

const SIDE_INDEX: Record<PaddingSide, number> = { top: 0, right: 1, bottom: 2, left: 3 };

/**
 * A hugging frame grows outward when padded; a fixed frame keeps its edge and
 * moves content inward. The handle follows the corresponding visible edge.
 */
export function paddingDragAmount(side: PaddingSide, deltaX: number, deltaY: number, hugsAxis: boolean): number {
  const axisDelta = side === 'top' || side === 'bottom' ? deltaY : deltaX;
  const inwardSign = side === 'top' || side === 'left' ? 1 : -1;
  return axisDelta * (hugsAxis ? -inwardSign : inwardSign);
}

export function paddingDragStyles(
  sides: PaddingSides,
  side: PaddingSide,
  amount: number,
  opposite: boolean,
  all: boolean,
  bigNudge: boolean,
): Record<string, string> {
  const next = [...sides] as PaddingSides;
  const step = bigNudge ? 10 : 1;
  const index = SIDE_INDEX[side];
  const indices = all ? [0, 1, 2, 3] : opposite ? [index, (index + 2) % 4] : [index];
  for (const target of indices) {
    const original = Number.parseFloat(sides[target]) || 0;
    next[target] = `${Math.max(0, Math.min(999, Math.round((original + amount) / step) * step))}px`;
  }
  // Clear a trailing shorthand before writing longhands. Without this, a
  // later `padding` value can override the drag's preview and source commit.
  return writePaddingSides(next);
}
