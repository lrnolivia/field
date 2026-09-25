import type { CanvasNode } from '@/code/parsing/parser';

/** Figma-style field Group: semantic collection with derived bounds.
 * A Group is not a Frame and does not own fill/clip/layout-mode semantics. */
export function isFieldGroup(node: CanvasNode | null | undefined): node is CanvasNode {
  return !!node?.isGroup;
}

export function canGroupSelection(
  nodeIds: readonly string[],
  nodes: Map<string, CanvasNode>,
): boolean {
  if (nodeIds.length < 2) return false;

  const selected: CanvasNode[] = [];
  for (const id of nodeIds) {
    const node = nodes.get(id);
    if (!node) return false;
    if (node.fromLayout || node.isChildrenSlot) return false;
    if (node.componentInstanceId) return false;
    selected.push(node);
  }

  const allCanvas = selected.every((n) => n.isCanvasNode && n.parentId == null);
  if (allCanvas) return true;

  const parentId = selected[0]?.parentId ?? null;
  if (!parentId) return false;
  return selected.every((n) => !n.isCanvasNode && n.parentId === parentId);
}

export function canUngroupNode(node: CanvasNode | null | undefined): node is CanvasNode {
  return !!node?.isGroup && node.children.length > 0;
}
