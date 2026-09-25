export interface FocalPosition {
  x: number;
  y: number;
}

export interface OverflowRange {
  x: number;
  y: number;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export function parseObjectPosition(value: string | undefined | null): FocalPosition {
  if (!value) return { x: 50, y: 50 };
  const parts = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { x: 50, y: 50 };

  const keyword = (part: string): { axis: 'x' | 'y' | 'both'; value: number } | null => {
    if (part === 'left') return { axis: 'x', value: 0 };
    if (part === 'right') return { axis: 'x', value: 100 };
    if (part === 'top') return { axis: 'y', value: 0 };
    if (part === 'bottom') return { axis: 'y', value: 100 };
    if (part === 'center') return { axis: 'both', value: 50 };
    return null;
  };
  const numeric = (part: string): number | null => {
    const parsed = Number.parseFloat(part);
    return Number.isFinite(parsed) ? clampPercent(parsed) : null;
  };

  // CSS permits one-axis keywords (`top`, `right`) and allows the two keyword
  // axes in either order (`top right` / `right top`). Normalize those shapes
  // before falling back to the ordinary x-then-y percentage grammar that field
  // writes itself. Length-valued object-position is intentionally treated as a
  // normalized percentage fallback here; Gallery's persisted v1 representation
  // is percentage focal coordinates.
  if (parts.length === 1) {
    const k = keyword(parts[0]);
    if (k?.axis === 'x') return { x: k.value, y: 50 };
    if (k?.axis === 'y') return { x: 50, y: k.value };
    if (k) return { x: 50, y: 50 };
    return { x: numeric(parts[0]) ?? 50, y: 50 };
  }

  const first = keyword(parts[0]);
  const second = keyword(parts[1]);
  if (first || second) {
    let x = 50;
    let y = 50;
    const unresolved: number[] = [];
    for (const part of parts.slice(0, 2)) {
      const k = keyword(part);
      if (k?.axis === 'x') x = k.value;
      else if (k?.axis === 'y') y = k.value;
      else if (!k) {
        const n = numeric(part);
        if (n != null) unresolved.push(n);
      }
    }
    if (unresolved.length > 0) {
      // A numeric token paired with a vertical keyword is the horizontal value;
      // paired with a horizontal keyword it is the vertical value. `center` is
      // positional: `center 25%` means x=center/y=25, while `25% center` means
      // x=25/y=center.
      if ((first?.axis === 'y') || (second?.axis === 'y')) x = unresolved[0];
      else if ((first?.axis === 'x') || (second?.axis === 'x')) y = unresolved[0];
      else if (first?.axis === 'both') y = unresolved[0];
      else x = unresolved[0];
    }
    return { x, y };
  }

  return { x: numeric(parts[0]) ?? 50, y: numeric(parts[1]) ?? 50 };
}

export function formatObjectPosition(position: FocalPosition): string {
  const round = (n: number) => Math.round(clampPercent(n) * 100) / 100;
  return `${round(position.x)}% ${round(position.y)}%`;
}

/**
 * Painted overflow for `object-fit: cover`.
 *
 * `object-position` does not translate by the frame size — it distributes the
 * DIFFERENCE between the rendered bitmap and the content box. Using frame width
 * made focal dragging far too slow for wide images and changed axes that had no
 * overflow at all. This is the real CSS geometry the drag needs.
 */
export function coverOverflow(
  frameWidth: number,
  frameHeight: number,
  imageWidth: number,
  imageHeight: number,
): OverflowRange {
  if (frameWidth <= 0 || frameHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { x: 0, y: 0 };
  }
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;
  return {
    x: Math.max(0, renderedWidth - frameWidth),
    y: Math.max(0, renderedHeight - frameHeight),
  };
}

/**
 * Convert a pointer drag into normalized object-position coordinates.
 * Dragging the bitmap right reveals its left side, so focal X moves left.
 * An axis with zero cover-overflow cannot visibly reposition and therefore
 * keeps its existing focal percentage unchanged.
 */
export function focalPositionAfterDrag(
  start: FocalPosition,
  deltaX: number,
  deltaY: number,
  overflowX: number,
  overflowY: number,
): FocalPosition {
  return {
    x: overflowX > 0 ? clampPercent(start.x - (deltaX / overflowX) * 100) : start.x,
    y: overflowY > 0 ? clampPercent(start.y - (deltaY / overflowY) * 100) : start.y,
  };
}
