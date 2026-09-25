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

function nativeGroupPositionMode(node: CanvasNode): 'absolute' | 'flow' | null {
  const position = (node.styles?.position ?? '').trim();
  if (position === 'absolute') return 'absolute';
  if (position === 'relative') return 'flow';
  return null;
}

function isSupportedNativeGroupContainer(node: CanvasNode): boolean {
  return !!node.isGroup && nativeGroupPositionMode(node) !== null && !hasUnsupportedTransform(node);
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

  // Native Groups may themselves be free-positioned OR one flow item inside
  // an Auto Layout/flex/grid parent. Their CHILD space is still canonical
  // absolute geometry. A flow Group must never gain left/top during refit —
  // its parent layout owns its placement — while an absolute Group shifts its
  // wrapper origin so child world-space boxes stay fixed.
  const groupMode = nativeGroupPositionMode(group);
  if (!groupMode || hasUnsupportedTransform(group)) return null;

  const groupLeft = groupMode === 'absolute' ? px(group.styles?.left, 0) : 0;
  const groupTop = groupMode === 'absolute' ? px(group.styles?.top, 0) : 0;
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
  // A flow Group's origin belongs to its parent layout. Shrink-wrapping may
  // change width/height, but it must NEVER rebase children away from that
  // origin: doing so visually moves the collection inside its Auto Layout slot.
  // Only a child union already rooted at local 0,0 can refit exactly.
  if (groupMode === 'flow' && (minX !== 0 || minY !== 0)) return null;

  const groupStyles: Record<string, string> = {
    ...(groupMode === 'absolute' ? {
      left: fmtPx(groupLeft + minX),
      top: fmtPx(groupTop + minY),
    } : {}),
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

export interface NativeGroupResizeBox {
  left: number;
  top: number;
  width: number;
  height: number;
  /** The node carries a visual transform (rotate/scale/transform).
   *  Uniform Group resize is exact; non-uniform resize is not. */
  transformed?: boolean;
}

/** Start-of-gesture, parent-local geometry for every descendant of a Group. */
export type NativeGroupResizeSnapshot = Map<string, NativeGroupResizeBox>;

export function nativeGroupResizeHasTransformedGeometry(
  snapshot: NativeGroupResizeSnapshot,
): boolean {
  for (const box of snapshot.values()) {
    if (box.transformed) return true;
  }
  return false;
}

/**
 * Normal Figma-style Group resize.
 *
 * A Group is not a Frame: resizing its selection box scales descendant BOX
 * geometry together, while typography, strokes, effects and other authored
 * visual properties remain untouched. The Scale tool is the separate
 * operation that scales those visual properties too.
 *
 * The Group wrapper itself is NOT returned here. ResizeManager already owns
 * the selected object's pin/unit/left/top commit; this planner only returns
 * descendant geometry so the whole gesture can land in one mutation batch.
 */
export function planNativeGroupResize(
  args: {
    groupId: string;
    nodes: Map<string, CanvasNode>;
    snapshot: NativeGroupResizeSnapshot;
    startWidth: number;
    startHeight: number;
    nextWidth: number;
    nextHeight: number;
  },
): NativeGroupRefitPlan | null {
  const { groupId, nodes, snapshot, startWidth, startHeight, nextWidth, nextHeight } = args;
  const root = nodes.get(groupId);
  if (!root?.isGroup || root.children.length === 0) return null;
  if (!(startWidth > 0) || !(startHeight > 0) || !(nextWidth > 0) || !(nextHeight > 0)) return null;

  const sx = nextWidth / startWidth;
  const sy = nextHeight / startHeight;
  if (!Number.isFinite(sx) || !Number.isFinite(sy)) return null;

  // A uniform parent-space scale commutes with rotation/visual transforms:
  // scaling the descendant's local left/top/width/height while leaving its
  // transform untouched produces the exact same rotated/scaled visual result.
  //
  // Non-uniform X/Y resize does NOT commute with rotation — reproducing that
  // would require a real affine/Scale model (potential skew/angle change).
  // Refuse it here rather than approximate and introduce mouse-up drift.
  if (nativeGroupResizeHasTransformedGeometry(snapshot)
      && Math.abs(sx - sy) > 1e-6) return null;

  const patches = new Map<string, Record<string, string>>();
  const groupIds: string[] = [groupId];
  const visiting = new Set<string>();

  const visit = (currentGroupId: string): boolean => {
    if (visiting.has(currentGroupId)) return false;
    visiting.add(currentGroupId);
    const group = nodes.get(currentGroupId);
    if (!group?.isGroup) return false;

    for (const childId of group.children) {
      const child = nodes.get(childId);
      const box = snapshot.get(childId);
      if (!child || !box) return false;
      if (![box.left, box.top, box.width, box.height].every(Number.isFinite)) return false;
      if (box.width < 0 || box.height < 0) return false;

      // Geometry only. Do not touch fontSize/lineHeight/stroke/filter/etc.
      mergePatch(patches, childId, {
        left: fmtPx(box.left * sx),
        top: fmtPx(box.top * sy),
        width: fmtPx(box.width * sx),
        height: fmtPx(box.height * sy),
      });

      if (child.isGroup) {
        groupIds.push(child.id);
        if (!visit(child.id)) return false;
      }
    }
    return true;
  };

  if (!visit(groupId)) return null;
  return {
    patches: [...patches].map(([nodeId, styles]) => ({ nodeId, styles })),
    groupIds,
  };
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
 * Collapse an empty native Group, then keep walking upward while removing that
 * Group makes its native-Group parent empty too. Returns the first surviving
 * native Group whose derived bounds now need refitting, or null when the chain
 * reaches a non-Group/root parent.
 */
function collapseEmptyGroupChainFrom(
  startGroupId: string | null,
  working: Map<string, CanvasNode>,
  patches: Map<string, Record<string, string>>,
  removeGroupIds: string[],
): string | null {
  let groupId = startGroupId;
  const visited = new Set<string>();

  while (groupId && !visited.has(groupId)) {
    visited.add(groupId);
    const group = working.get(groupId);
    if (!group?.isGroup) return null;
    if (group.children.length > 0) return group.id;

    if (!removeGroupIds.includes(group.id)) removeGroupIds.push(group.id);
    patches.delete(group.id);

    const parentId = group.parentId;
    working.delete(group.id);
    if (!parentId) return null;

    const parent = working.get(parentId);
    if (!parent) return null;
    working.set(parentId, {
      ...parent,
      children: parent.children.filter((id) => id !== group.id),
    });
    groupId = parent.isGroup ? parent.id : null;
  }

  return null;
}

export interface NativeGroupDeletionCleanupPlan {
  patches: NativeGroupRefitPatch[];
  groupIds: string[];
  removeGroupIds: string[];
}

export function planNativeGroupDeletionCleanup(
  deletedIds: readonly string[],
  nodes: Map<string, CanvasNode>,
): NativeGroupDeletionCleanupPlan | null {
  if (deletedIds.length === 0) return null;

  const working = new Map(nodes);
  const deleted = new Set(deletedIds);
  const affectedGroups = new Set<string>();

  for (const id of deleted) {
    const node = working.get(id);
    const parentId = node?.parentId ?? null;
    if (!parentId) continue;
    const parent = working.get(parentId);
    if (!parent) continue;
    working.set(parentId, {
      ...parent,
      children: parent.children.filter((childId) => childId !== id),
    });
    if (parent.isGroup) affectedGroups.add(parent.id);
  }
  for (const id of deleted) working.delete(id);

  if (affectedGroups.size === 0) return null;

  const patches = new Map<string, Record<string, string>>();
  const groupIds: string[] = [];
  const removeGroupIds: string[] = [];
  const survivingStarts = new Set<string>();

  for (const groupId of affectedGroups) {
    if (!working.has(groupId)) continue;
    const survivor = collapseEmptyGroupChainFrom(groupId, working, patches, removeGroupIds);
    if (survivor) survivingStarts.add(survivor);
  }

  for (const groupId of survivingStarts) {
    refitGroupChainFrom(groupId, working, patches, groupIds);
  }

  return {
    patches: [...patches].map(([nodeId, styles]) => ({ nodeId, styles })),
    groupIds: [...new Set(groupIds)].filter((id) => working.has(id)),
    removeGroupIds,
  };
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

  // Both free-positioned Groups and Groups seated as ONE Auto Layout item
  // share the same absolute child-space. The destination's live world rect is
  // supplied by Layers, so reparenting can preserve world geometry either way.
  if (destinationIsGroup && !isSupportedNativeGroupContainer(destination)) return null;
  if (sourceIsGroup && source && !isSupportedNativeGroupContainer(source)) return null;

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
    const survivingSourceGroupId = collapseEmptyGroupChainFrom(
      source.id,
      working,
      patches,
      removeGroupIds,
    );
    if (survivingSourceGroupId) {
      if (!planNativeGroupRefit(survivingSourceGroupId, working)) return null;
      refitGroupChainFrom(survivingSourceGroupId, working, patches, groupIds);
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
