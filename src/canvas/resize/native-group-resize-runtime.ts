import { getCanvasBridge } from '@/canvas/canvas-bridge';
import {
  findNodeComputedStyles,
  getContentRoot,
  getViewportPrefix,
  updateNodeStyles,
} from '@/canvas/node-ops';
import { getCachedNodesMap, getNodeFromCache } from '@/code/stores/store';
import {
  nativeGroupResizeHasCompleteAffineGeometry,
  nativeGroupResizeHasTransformedGeometry,
  nativeGroupResizeNodeSupportsAffine,
  planNativeGroupResize,
  resolveNativeGroupResizeAffineFromCorners,
  type NativeGroupResizeCorners,
  type NativeGroupResizeSnapshot,
} from '@/code/groups/group-refit';
import { trace } from '@/shared/debug-trace';

function readNativeGroupResizeCorners(nodeId: string, vpId: string): NativeGroupResizeCorners | null {
  const bridge = getCanvasBridge() as any;
  if (typeof bridge.getCachedCorners !== 'function') return null;
  return bridge.getCachedCorners(nodeId, getViewportPrefix(vpId)) ?? null;
}

function readNativeGroupResizeLocalSize(nodeId: string, vpId: string): { width: number; height: number } | null {
  const values = findNodeComputedStyles(nodeId, vpId, ['__offsetWidth', '__offsetHeight']);
  const width = Number.parseFloat(values.__offsetWidth ?? '');
  const height = Number.parseFloat(values.__offsetHeight ?? '');
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

export function captureNativeGroupResizeSnapshot(
  groupId: string,
  vpId: string,
): NativeGroupResizeSnapshot | null {
  const root = getNodeFromCache(groupId);
  if (!root?.isGroup || root.children.length === 0) return null;

  const snapshot: NativeGroupResizeSnapshot = new Map();
  const visiting = new Set<string>();
  const groupGeometry = new Map<string, { corners: NativeGroupResizeCorners; width: number; height: number }>();

  const readGroupGeometry = (gid: string) => {
    const cached = groupGeometry.get(gid);
    if (cached) return cached;
    const corners = readNativeGroupResizeCorners(gid, vpId);
    const size = readNativeGroupResizeLocalSize(gid, vpId);
    if (!corners || !size) return null;
    const value = { corners, width: size.width, height: size.height };
    groupGeometry.set(gid, value);
    return value;
  };

  const visit = (gid: string): boolean => {
    if (visiting.has(gid)) return false;
    visiting.add(gid);
    const group = getNodeFromCache(gid);
    if (!group?.isGroup) return false;

    for (const childId of group.children) {
      const child = getNodeFromCache(childId);
      if (!child) return false;
      const cs = findNodeComputedStyles(childId, vpId, [
        'position', 'left', 'top', 'width', 'height', 'transform', 'rotate', 'scale',
      ]);
      if (cs.position !== 'absolute') return false;
      const transform = (cs.transform || '').trim();
      const rotate = (cs.rotate || '').trim();
      const scale = (cs.scale || '').trim();
      const transformed = !!((transform && transform !== 'none')
        || (rotate && rotate !== 'none' && rotate !== '0' && rotate !== '0deg')
        || (scale && scale !== 'none' && scale !== '1'));

      const left = Number.parseFloat(cs.left);
      const top = Number.parseFloat(cs.top);
      const width = Number.parseFloat(cs.width);
      const height = Number.parseFloat(cs.height);
      if (![left, top, width, height].every(Number.isFinite) || width < 0 || height < 0) return false;

      const box = { left, top, width, height };
      if (transformed) {
        if (!nativeGroupResizeNodeSupportsAffine(child, width, height)) return false;
        const parentGeometry = readGroupGeometry(gid);
        const childWorldCorners = readNativeGroupResizeCorners(childId, vpId);
        if (!parentGeometry || !childWorldCorners) return false;
        const affine = resolveNativeGroupResizeAffineFromCorners({
          childWorldCorners,
          parentWorldCorners: parentGeometry.corners,
          parentLocalWidth: parentGeometry.width,
          parentLocalHeight: parentGeometry.height,
          childBox: box,
        });
        if (!affine) return false;
        snapshot.set(childId, { ...box, transformed: true, affine });
      } else {
        snapshot.set(childId, box);
      }

      if (child.isGroup && !visit(child.id)) return false;
    }
    return true;
  };

  return visit(groupId) ? snapshot : null;
}

export type NativeGroupResizeInteractionPolicy = 'free' | 'blocked';

export function nativeGroupResizeInteractionPolicy(
  snapshot: NativeGroupResizeSnapshot,
  _isCorner: boolean,
): NativeGroupResizeInteractionPolicy {
  if (!nativeGroupResizeHasTransformedGeometry(snapshot)) return 'free';
  return nativeGroupResizeHasCompleteAffineGeometry(snapshot) ? 'free' : 'blocked';
}

function px(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(Object.is(rounded, -0) ? 0 : rounded) + 'px';
}

/**
 * Inspector W/H for a native Group. A Group dimension is derived geometry:
 * changing it scales descendant boxes exactly like the canvas resize handles.
 * No direct wrapper-only size write, no Hug/Fill conversion, no layout injection.
 */
export function commitNativeGroupInspectorResize(args: {
  groupId: string;
  vpId: string;
  nextWidth?: number;
  nextHeight?: number;
}): boolean {
  const { groupId, vpId } = args;
  const group = getNodeFromCache(groupId);
  const contentEl = getContentRoot();
  if (!group?.isGroup || !contentEl) return false;

  const current = findNodeComputedStyles(groupId, vpId, ['width', 'height']);
  const startWidth = Number.parseFloat(current.width ?? '');
  const startHeight = Number.parseFloat(current.height ?? '');
  const nextWidth = args.nextWidth ?? startWidth;
  const nextHeight = args.nextHeight ?? startHeight;
  if (![startWidth, startHeight, nextWidth, nextHeight].every(Number.isFinite)
      || startWidth <= 0 || startHeight <= 0 || nextWidth <= 0 || nextHeight <= 0) {
    trace.action('size:native-group-inspector-resize-refused', {
      groupId, vpId, reason: 'invalid-size', startWidth, startHeight, nextWidth, nextHeight,
    });
    return false;
  }

  const snapshot = captureNativeGroupResizeSnapshot(groupId, vpId);
  if (!snapshot || nativeGroupResizeInteractionPolicy(snapshot, true) === 'blocked') {
    trace.action('size:native-group-inspector-resize-refused', {
      groupId, vpId, reason: 'unsupported-geometry',
    });
    return false;
  }

  const plan = planNativeGroupResize({
    groupId,
    nodes: getCachedNodesMap(),
    snapshot,
    startWidth,
    startHeight,
    nextWidth,
    nextHeight,
  });
  if (!plan) {
    trace.action('size:native-group-inspector-resize-refused', {
      groupId, vpId, reason: 'planner-refused',
    });
    return false;
  }

  const viewportPrefix = getViewportPrefix(vpId);
  for (const patch of plan.patches) {
    updateNodeStyles({
      id: patch.nodeId,
      styles: patch.styles,
      contentEl,
      viewportPrefix,
      skipGroupRefit: true,
    });
  }
  updateNodeStyles({
    id: groupId,
    styles: { width: px(nextWidth), height: px(nextHeight) },
    contentEl,
    viewportPrefix,
  });

  trace.action('size:native-group-inspector-resize', {
    groupId, vpId, nextWidth, nextHeight, patchCount: plan.patches.length,
  });
  return true;
}
