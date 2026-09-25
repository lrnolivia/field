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

export interface NativeGroupLayersReparentPlan {
  moveStyles: Record<string, string>;
  patches: NativeGroupRefitPatch[];
  groupIds: string[];
  removeGroupIds: string[];
}

export interface NativeGroupWorldBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function applyRefitStepToWorking(
  groupId: string,
  working: Map<string, CanvasNode>,
  patches: Map<string, Record<string, string>>,
  groupIds: string[],
): string | null {
  const step = planNativeGroupRefit(groupId, working);
  if (!step) return null;
  groupIds.push(groupId);
  for (const patch of step.patches) {
    mergePatch(patches, patch.nodeId, patch.styles);
    const node = working.get(patch.nodeId);
    if (node) working.set(patch.nodeId, cloneWithStyles(node, patch.styles));
  }
  const group = working.get(groupId);
  const parentId = group?.parentId ?? null;
  return parentId && working.get(parentId)?.isGroup ? parentId : null;
}

function refitGroupChainFrom(
  startGroupId: string | null,
  working: Map<string, CanvasNode>,
  patches: Map<string, Record<string, string>>,
  groupIds: string[],
): void {
  let groupId = startGroupId;
  const visited = new Set<string>();
  while (groupId && !visited.has(groupId)) {
    visited.add(groupId);
    const next = applyRefitStepToWorking(groupId, working, patches, groupIds);
    if (!next) break;
    groupId = next;
  }
}

/**
 * Plan the native-Group-specific part of a Layers reparent gesture.
 *
 * The structural move itself remains owned by the existing Layers mutation
 * pipeline. This planner builds the POST-MOVE tree in memory, converts the
 * dragged box to destination-local absolute coordinates when world geometry
 * must be preserved, then shrink-wraps source/destination Group chains.
 *
 * It intentionally returns null when neither side is a native Group.
 */
export function planNativeGroupLayersReparent(
  args: {
    draggedId: string;
    newParentId: string;
    nodes: Map<string, CanvasNode>;
    draggedWorld: NativeGroupWorldBox;
    newParentWorld: NativeGroupWorldBox;
    preserveDraggedGeometry: boolean;
  },
): NativeGroupLayersReparentPlan | null {
  const { draggedId, newParentId, nodes, draggedWorld, newParentWorld, preserveDraggedGeometry } = args;
  const dragged = nodes.get(draggedId);
  const destination = nodes.get(newParentId);
  if (!dragged || !destination || !dragged.parentId || dragged.parentId === newParentId) return null;

  const source = nodes.get(dragged.parentId);
  const sourceIsGroup = !!source?.isGroup;
  const destinationIsGroup = !!destination.isGroup;
  if (!sourceIsGroup && !destinationIsGroup) return null;

  // B2 remains conservative wherever Group shrink-wrap cannot be computed
  // exactly by the B1 planner. A destination Group must be canonical before we
  // author Group-local coordinates into it.
  if (destinationIsGroup && ((destination.styles?.position ?? '') !== 'absolute' || hasUnsupportedTransform(destination))) return null;
  if (sourceIsGroup && source && ((source.styles?.position ?? '') !== 'absolute' || hasUnsupportedTransform(source))) return null;

  const working = new Map(nodes);
  const patches = new Map<string, Record<string, string>>();
  const groupIds: string[] = [];
  const removeGroupIds: string[] = [];
  const oldParentId = dragged.parentId;

  const oldParent = working.get(oldParentId);
  if (oldParent) working.set(oldParentId, { ...oldParent, children: oldParent.children.filter((id) => id !== draggedId) });
  const newParent = working.get(newParentId)!;
  working.set(newParentId, { ...newParent, children: [...newParent.children.filter((id) => id !== draggedId), draggedId] });

  const moveStyles: Record<string, string> = {};
  if (preserveDraggedGeometry) {
    moveStyles.position = 'absolute';
    moveStyles.left = fmtPx(draggedWorld.left - newParentWorld.left);
    moveStyles.top = fmtPx(draggedWorld.top - newParentWorld.top);
    moveStyles.right = '';
    moveStyles.bottom = '';
  }
  working.set(draggedId, {
    ...dragged,
    parentId: newParentId,
    styles: { ...dragged.styles, ...moveStyles },
  });

  if (sourceIsGroup && source) {
    const postSource = working.get(source.id)!;
    if (postSource.children.length > 0 && !planNativeGroupRefit(source.id, working)) return null;
    if (postSource.children.length === 0) {
      removeGroupIds.push(source.id);
      const sourceParentId = source.parentId;
      working.delete(source.id);
      if (sourceParentId) {
        const sourceParent = working.get(sourceParentId);
        if (sourceParent) {
          working.set(sourceParentId, { ...sourceParent, children: sourceParent.children.filter((id) => id !== source.id) });
          if (sourceParent.isGroup) refitGroupChainFrom(sourceParent.id, working, patches, groupIds);
        }
      }
    } else {
      refitGroupChainFrom(source.id, working, patches, groupIds);
    }
  }

  if (destinationIsGroup && working.has(newParentId)) {
    if (!planNativeGroupRefit(newParentId, working)) return null;
    refitGroupChainFrom(newParentId, working, patches, groupIds);
  }

  return {
    moveStyles,
    patches: [...patches].map(([nodeId, styles]) => ({ nodeId, styles })),
    groupIds,
    removeGroupIds,
  };
}
