import type { CanvasNode } from '@/code/parsing/parser';

/** Resolve the parser's banded inline __mq values for one replica tile. */
export function responsiveStyleValuesAtWidth(
  node: CanvasNode | null,
  width: number,
): Record<string, string> | null {
  const values = node?.responsiveStyleValues;
  if (!values || !width) return null;
  const resolved: Record<string, string> = {};
  for (const [property, byWidth] of Object.entries(values)) {
    const widths = Object.keys(byWidth).map(Number).sort((a, b) => a - b);
    for (const maxWidth of widths) {
      const minWidth = node?.responsiveStyleBands?.[property]?.[maxWidth] ?? 0;
      if (width <= maxWidth && width >= minWidth) {
        resolved[property] = byWidth[maxWidth];
        break;
      }
    }
  }
  return Object.keys(resolved).length ? resolved : null;
}

export function mergeResponsiveStyleValues(
  base: Record<string, string>,
  node: CanvasNode | null,
  width: number,
): Record<string, string> {
  const values = responsiveStyleValuesAtWidth(node, width);
  return values ? { ...base, ...values } : base;
}
