import { findNodeRect, getViewportPrefix } from '@/canvas/node-ops';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import type { RulerGuide } from '@/code/project/ruler-guides-config';
import { getNodeFromCache } from '@/code/stores/store';
import { isFrameTag } from '@/shared/constants';

type GuideFrame = NonNullable<RulerGuide['frame']>;

export function frameGuideRect(frame: GuideFrame): DOMRect | null {
  const node = getNodeFromCache(frame.id);
  if (!node || node.styles.display === 'none' || node.styles.visibility === 'hidden') return null;
  const rect = findNodeRect(frame.id, frame.viewportId);
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  // The current ruler and snap engine use screen-aligned lines.
  const bridge = getCanvasBridge();
  const corners = 'getCachedCorners' in bridge && typeof bridge.getCachedCorners === 'function'
    ? bridge.getCachedCorners(frame.id, getViewportPrefix(frame.viewportId))
    : null;
  if (corners && (Math.abs(corners.TL.y - corners.TR.y) > 0.5
    || Math.abs(corners.TL.x - corners.BL.x) > 0.5
    || corners.TL.x > corners.TR.x || corners.TL.y > corners.BL.y)) return null;
  return rect;
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

export function guideDropFrame(frame: GuideFrame | undefined, x: number, y: number): DOMRect | undefined {
  const rect = frame ? frameGuideRect(frame) : null;
  return rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom ? rect : undefined;
}
