import { findNodeComputedStyles } from '@/canvas/node-ops';
import { invertProjective, solveHomography, type ProjectiveMap } from '@/canvas/creators/creator-utils';
import { getScreenCornersById } from '@/canvas/resize/geometry-utils';
import type { RulerGuide } from '@/code/project/ruler-guides-config';
import { getNodeFromCache } from '@/code/stores/store';
import { isFrameTag } from '@/shared/constants';
import type { Point } from '@/shared/types';

type GuideFrame = NonNullable<RulerGuide['frame']>;
type GuideType = RulerGuide['type'];

export interface FrameGuideGeometry {
  width: number;
  height: number;
  map: ProjectiveMap;
  toLocal: (x: number, y: number) => Point;
}

export interface FrameGuideSegment {
  start: Point;
  end: Point;
}

export function frameGuideGeometry(frame: GuideFrame): FrameGuideGeometry | null {
  const node = getNodeFromCache(frame.id);
  if (!node || node.styles.display === 'none' || node.styles.visibility === 'hidden') return null;
  const corners = getScreenCornersById(frame.id, frame.viewportId);
  if (!corners) return null;
  const styles = findNodeComputedStyles(frame.id, frame.viewportId, ['__offsetWidth', '__offsetHeight']);
  const width = Number.parseFloat(styles.__offsetWidth);
  const height = Number.parseFloat(styles.__offsetHeight);
  if (!(width > 0 && height > 0)) return null;
  const map = solveHomography(width, height, corners.TL, corners.TR, corners.BR, corners.BL);
  const inverse = invertProjective(map);
  return inverse ? { width, height, map, toLocal: inverse.invertScreen } : null;
}

export function frameGuideLimit(geometry: FrameGuideGeometry, type: GuideType): number {
  return type === 'horizontal' ? geometry.height : geometry.width;
}

export function frameGuideCoordinate(geometry: FrameGuideGeometry, type: GuideType, x: number, y: number): number {
  const local = geometry.toLocal(x, y);
  return type === 'horizontal' ? local.y : local.x;
}

export function frameGuideToScreen(geometry: FrameGuideGeometry, x: number, y: number): Point {
  const [a, b, c, d, e, f, g, h, i] = geometry.map.h;
  const w = g * x + h * y + i;
  return { x: (a * x + b * y + c) / w, y: (d * x + e * y + f) / w };
}

export function frameGuideSegment(geometry: FrameGuideGeometry, type: GuideType, position: number): FrameGuideSegment | null {
  const limit = frameGuideLimit(geometry, type);
  // Source stores hundredths of a pixel. Permit rounding at the border.
  if (!(position >= -0.005 && position <= limit + 0.005)) return null;
  const at = Math.max(0, Math.min(limit, position));
  const start = type === 'horizontal' ? frameGuideToScreen(geometry, 0, at) : frameGuideToScreen(geometry, at, 0);
  const end = type === 'horizontal' ? frameGuideToScreen(geometry, geometry.width, at) : frameGuideToScreen(geometry, at, geometry.height);
  return [start.x, start.y, end.x, end.y].every(Number.isFinite) ? { start, end } : null;
}

export function selectedGuideFrame(ids: string[], viewportId: string): GuideFrame | undefined {
  if (ids.length !== 1) return undefined;
  const node = getNodeFromCache(ids[0]);
  if (!node || node.isGroup || node.isCodeComponent || node.isComponentInstance || !isFrameTag(node.type)) return undefined;
  return { id: node.id, viewportId };
}

export function isInsideGuideFrame(nodeId: string, frameId: string): boolean {
  const seen = new Set<string>();
  let parentId = getNodeFromCache(nodeId)?.parentId;
  while (parentId && !seen.has(parentId)) {
    if (parentId === frameId) return true;
    seen.add(parentId);
    parentId = getNodeFromCache(parentId)?.parentId;
  }
  return false;
}

export function guideDropFrame(frame: GuideFrame | undefined, type: GuideType, x: number, y: number) {
  const geometry = frame ? frameGuideGeometry(frame) : null;
  if (!geometry) return undefined;
  const local = geometry.toLocal(x, y);
  if (!(local.x >= 0 && local.x <= geometry.width && local.y >= 0 && local.y <= geometry.height)) return undefined;
  const position = type === 'horizontal' ? local.y : local.x;
  const segment = frameGuideSegment(geometry, type, position);
  return segment ? { position, segment } : undefined;
}
