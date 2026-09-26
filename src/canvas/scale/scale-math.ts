// scale-math.ts — pure uniform Scale geometry.
// Dedicated Scale is intentionally separate from Resize semantics.

export type ScaleAnchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type ScaleCornerDirection = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

export interface ScalePoint { x: number; y: number }
export interface ScaleBox { left: number; top: number; width: number; height: number }

export const MIN_SCALE_FACTOR = 0.0001;

const ANCHOR_FRACTIONS: Record<ScaleAnchor, readonly [number, number]> = {
  'top-left': [0, 0],
  'top-center': [0.5, 0],
  'top-right': [1, 0],
  'center-left': [0, 0.5],
  center: [0.5, 0.5],
  'center-right': [1, 0.5],
  'bottom-left': [0, 1],
  'bottom-center': [0.5, 1],
  'bottom-right': [1, 1],
};

export function anchorFractions(anchor: ScaleAnchor): readonly [number, number] {
  return ANCHOR_FRACTIONS[anchor];
}

export function anchorPoint(box: ScaleBox, anchor: ScaleAnchor): ScalePoint {
  const [fx, fy] = anchorFractions(anchor);
  return {
    x: box.left + box.width * fx,
    y: box.top + box.height * fy,
  };
}

export function scalePoint(point: ScalePoint, anchor: ScalePoint, factor: number): ScalePoint {
  return {
    x: anchor.x + factor * (point.x - anchor.x),
    y: anchor.y + factor * (point.y - anchor.y),
  };
}

export function scaleBoxFromAnchor(box: ScaleBox, anchor: ScaleAnchor, factor: number): ScaleBox {
  const fixed = anchorPoint(box, anchor);
  const nextTL = scalePoint({ x: box.left, y: box.top }, fixed, factor);
  return {
    left: nextTL.x,
    top: nextTL.y,
    width: box.width * factor,
    height: box.height * factor,
  };
}

export function oppositeAnchorForCorner(direction: ScaleCornerDirection): ScaleAnchor {
  switch (direction) {
    case 'topLeft': return 'bottom-right';
    case 'topRight': return 'bottom-left';
    case 'bottomRight': return 'top-left';
    case 'bottomLeft': return 'top-right';
  }
}

export function cornerPoint(box: ScaleBox, direction: ScaleCornerDirection): ScalePoint {
  switch (direction) {
    case 'topLeft': return { x: box.left, y: box.top };
    case 'topRight': return { x: box.left + box.width, y: box.top };
    case 'bottomRight': return { x: box.left + box.width, y: box.top + box.height };
    case 'bottomLeft': return { x: box.left, y: box.top + box.height };
  }
}

/**
 * Uniform pointer factor from the projection of the live pointer vector onto
 * the start vector. This keeps diagonal Scale stable even when the pointer
 * does not travel on the exact original diagonal.
 */
export function scaleFactorFromPointer(
  anchor: ScalePoint,
  startPointer: ScalePoint,
  currentPointer: ScalePoint,
  minimum = MIN_SCALE_FACTOR,
): number {
  const sx = startPointer.x - anchor.x;
  const sy = startPointer.y - anchor.y;
  const denom = sx * sx + sy * sy;
  if (denom <= 1e-9) return 1;
  const cx = currentPointer.x - anchor.x;
  const cy = currentPointer.y - anchor.y;
  const projected = (cx * sx + cy * sy) / denom;
  if (!Number.isFinite(projected)) return 1;
  return Math.max(minimum, projected);
}

export function canonicalizeScaleRoots<T extends { parentId: string | null }>(
  ids: readonly string[],
  nodes: ReadonlyMap<string, T>,
): string[] {
  const ordered = Array.from(new Set(ids)).filter((id) => nodes.has(id));
  const selected = new Set(ordered);
  return ordered.filter((id) => {
    let parent = nodes.get(id)?.parentId ?? null;
    const seen = new Set<string>();
    while (parent) {
      if (selected.has(parent)) return false;
      if (seen.has(parent)) break;
      seen.add(parent);
      parent = nodes.get(parent)?.parentId ?? null;
    }
    return true;
  });
}

export function unionBoxes(boxes: readonly ScaleBox[]): ScaleBox | null {
  if (boxes.length === 0) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const box of boxes) {
    left = Math.min(left, box.left);
    top = Math.min(top, box.top);
    right = Math.max(right, box.left + box.width);
    bottom = Math.max(bottom, box.top + box.height);
  }
  if (![left, top, right, bottom].every(Number.isFinite)) return null;
  return { left, top, width: right - left, height: bottom - top };
}

export function formatScaleNumber(value: number, precision = 3): string {
  const p = 10 ** precision;
  const rounded = Math.round(value * p) / p;
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return String(normalized);
}

export function formatScalePx(value: number): string {
  return `${formatScaleNumber(value)}px`;
}
