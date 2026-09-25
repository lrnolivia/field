import type { CanvasNode } from '@/code/parsing/parser';

export interface NativeGroupRefitPatch {
  nodeId: string;
  styles: Record<string, string>;
}

export interface NativeGroupRefitPlan {
  patches: NativeGroupRefitPatch[];
  groupIds: string[];
}

const BOX_KEYS = new Set(['left', 'top', 'width', 'height']);

function px(value: string | undefined, fallback?: number): number | null {
  if (value == null || value === '') return fallback ?? null;
  const trimmed = value.trim();
  if (trimmed === '0') return 0;
  if (!/^-?(?:\d+|\d*\.\d+)px$/.test(trimmed)) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function fmtPx(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return `${normalized}px`;
}

function hasUnsupportedTransform(node: CanvasNode): boolean {
  const transform = node.styles?.transform?.trim();
  const rotate = node.styles?.rotate?.trim();
  const scale = node.styles?.scale?.trim();
  return (!!transform && transform !== 'none')
    || (!!rotate && rotate !== '0' && rotate !== '0deg')
    || (!!scale && scale !== '1');
}

function mergePatch(
  patches: Map<string, Record<string, string>>,
  nodeId: string,
  styles: Record<string, string>,
): void {
  const prev = patches.get(nodeId);
  patches.set(nodeId, prev ? { ...prev, ...styles } : styles);
}

function cloneWithStyles(
  node: CanvasNode,
  styles: Record<string, string>,
): CanvasNode {
  return { ...node, styles: { ...node.styles, ...styles } };
}

/**
 * Compute one shrink-wrap step for a native field Group.
 *
 * Phase B1 is intentionally conservative: it handles the canonical absolute,
 * pixel-backed geometry produced by native Group creation. It refuses to guess
 * through transformed, percentage, calc(), viewport-unit, or flow children.
 *
 * The returned patches preserve every child's world-space box:
 *
 *   newGroup.left = oldGroup.left + min(child.left)
 *   newChild.left = oldChild.left - min(child.left)
 *
 * and likewise for Y. Width/height become the direct-child union.
 */
export function planNativeGroupRefit(
  groupId: string,
  nodes: Map<string, CanvasNode>,
): NativeGroupRefitPlan | null {
  const group = nodes.get(groupId);
  if (!group?.isGroup || group.children.length === 0) return null;

  // A flow-positioned Group inside Auto Layout needs parent-layout-aware
  // origin semantics. Phase B1 does not guess there; Phase B2 owns it.
  if ((group.styles?.position ?? '') !== 'absolute') return null;
  if (hasUnsupportedTransform(group)) return null;

  const groupLeft = px(group.styles?.left, 0);
  const groupTop = px(group.styles?.top, 0);
  if (groupLeft == null || groupTop == null) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const children: Array<{ node: CanvasNode; left: number; top: number; width: number; height: number }> = [];

  for (const childId of group.children) {
    const child = nodes.get(childId);
    if (!child) return null;
    if ((child.styles?.position ?? '') !== 'absolute') return null;
    if (hasUnsupportedTransform(child)) return null;

    const left = px(child.styles?.left, 0);
    const top = px(child.styles?.top, 0);
    const width = px(child.styles?.width);
    const height = px(child.styles?.height);
    if (left == null || top == null || width == null || height == null) return null;
    if (width < 0 || height < 0) return null;

    children.push({ node: child, left, top, width, height });
    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, left + width);
    maxY = Math.max(maxY, top + height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)
      || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;

  const patches = new Map<string, Record<string, string>>();
  const groupStyles: Record<string, string> = {
    left: fmtPx(groupLeft + minX),
    top: fmtPx(groupTop + minY),
    width: fmtPx(maxX - minX),
    height: fmtPx(maxY - minY),
  };
  mergePatch(patches, groupId, groupStyles);

  if (minX !== 0 || minY !== 0) {
    for (const child of children) {
      mergePatch(patches, child.node.id, {
        left: fmtPx(child.left - minX),
        top: fmtPx(child.top - minY),
      });
    }
  }

  return {
    patches: [...patches].map(([nodeId, styles]) => ({ nodeId, styles })),
    groupIds: [groupId],
  };
}

/**
 * Refit the native Group that directly contains `changedNodeId`, then continue
 * upward through nested native Groups. Each completed step is applied to an
 * in-memory working map before the ancestor is planned, so ancestors see the
 * post-refit geometry of their child Group.
 */
export function planNativeGroupRefitChain(
  changedNodeId: string,
  nodes: Map<string, CanvasNode>,
): NativeGroupRefitPlan | null {
  const changed = nodes.get(changedNodeId);
  if (!changed?.parentId) return null;

  const immediate = nodes.get(changed.parentId);
  if (!immediate?.isGroup) return null;

  const working = new Map(nodes);
  const patches = new Map<string, Record<string, string>>();
  const groupIds: string[] = [];
  let groupId: string | null = immediate.id;

  while (groupId) {
    const step = planNativeGroupRefit(groupId, working);
    if (!step) break;

    groupIds.push(groupId);
    for (const patch of step.patches) {
      mergePatch(patches, patch.nodeId, patch.styles);
      const node = working.get(patch.nodeId);
      if (node) working.set(patch.nodeId, cloneWithStyles(node, patch.styles));
    }

    const refitGroup = working.get(groupId);
    const parentId = refitGroup?.parentId ?? null;
    const parent = parentId ? working.get(parentId) : null;
    groupId = parent?.isGroup ? parent.id : null;
  }

  if (groupIds.length === 0) return null;
  return {
    patches: [...patches].map(([nodeId, styles]) => ({ nodeId, styles })),
    groupIds,
  };
}

export function touchesNativeGroupGeometry(styles: Record<string, string>): boolean {
  return Object.keys(styles).some((key) => BOX_KEYS.has(key));
}
