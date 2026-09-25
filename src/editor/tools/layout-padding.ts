import { resolveSpacingSides } from '@/shared/css-utils';

export type PaddingSides = [string, string, string, string];

export function readPaddingSides(styles: Record<string, string>): PaddingSides {
  return resolveSpacingSides(styles, 'padding');
}

export function normalizePaddingPx(raw: string): string {
  return `${Math.max(0, Math.min(999, Number.parseFloat(raw) || 0))}px`;
}

export function writePaddingSides(sides: PaddingSides): Record<string, string> {
  return {
    padding: '',
    paddingTop: sides[0],
    paddingRight: sides[1],
    paddingBottom: sides[2],
    paddingLeft: sides[3],
  };
}

export function setPaddingAxis(
  sides: PaddingSides,
  axis: 'horizontal' | 'vertical',
  raw: string,
): Record<string, string> {
  const next = [...sides] as PaddingSides;
  const value = normalizePaddingPx(raw);
  if (axis === 'horizontal') {
    next[1] = value;
    next[3] = value;
  } else {
    next[0] = value;
    next[2] = value;
  }
  return writePaddingSides(next);
}

export function setPaddingSide(
  sides: PaddingSides,
  index: number,
  raw: string,
): Record<string, string> {
  const next = [...sides] as PaddingSides;
  next[index] = normalizePaddingPx(raw);
  return writePaddingSides(next);
}

export function paddingAxisCompatible(sides: PaddingSides): boolean {
  return (Number.parseFloat(sides[0]) || 0) === (Number.parseFloat(sides[2]) || 0)
    && (Number.parseFloat(sides[1]) || 0) === (Number.parseFloat(sides[3]) || 0);
}

export function collapsePaddingToAxes(sides: PaddingSides): Record<string, string> {
  return writePaddingSides([sides[0], sides[1], sides[0], sides[1]]);
}
