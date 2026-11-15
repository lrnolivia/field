import type { CanvasNode } from '@/code/parsing/parser';

export const BREAKPOINT_FILLS_ATTR = 'data-field-breakpoint-fills';
export const FILL_VIEWPORT_ATTR = 'data-field-fill-viewport';
export const FILL_VIEWPORT_PREFIX = 'scope:';

export type BreakpointFill = (
  | { kind: 'pattern'; recipe: string }
  | { kind: 'shader' }
  | { kind: 'video' }
  | { kind: 'none' }
) & { hostStyleBackup?: Record<string, string> };

export type FillMap = Partial<Record<string, BreakpointFill>>;

export function readBreakpointFills(raw?: string): FillMap {
  const result: FillMap = Object.create(null);
  if (!raw) return result;
  try {
    const value = JSON.parse(decodeURIComponent(raw));
    if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(result, value);
  } catch { /* open legacy or manually edited source */ }
  return result;
}

export function breakpointFill(node: CanvasNode | null | undefined, viewportId: string): BreakpointFill | undefined {
  return readBreakpointFills(node?.attrs?.[BREAKPOINT_FILLS_ATTR])[viewportId];
}

export function breakpointVideo(node: CanvasNode, viewportId: string): CanvasNode['bgVideo'] {
  const fill = breakpointFill(node, viewportId);
  if (!fill) return node.bgVideo;
  return fill.kind === 'video' ? node.breakpointVideos?.[viewportId] : undefined;
}

export function shaderLayerVisible(parent: CanvasNode | undefined, child: CanvasNode, viewportId: string): boolean {
  if (child.attrs?.['data-field-shader-layer'] !== 'true') return true;
  const fill = breakpointFill(parent, viewportId);
  const layerScope = child.attrs[FILL_VIEWPORT_ATTR]?.slice(FILL_VIEWPORT_PREFIX.length);
  return fill ? fill.kind === 'shader' && layerScope === viewportId : layerScope === undefined;
}
