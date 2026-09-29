export type ToolbarMediaElementKind = 'image' | 'video' | 'audio';

export type ToolbarMediaPlacement =
  | { type: 'insert' }
  | { type: 'replace'; nodeId: string };

const MEDIA_NODE_TYPES: Record<ToolbarMediaElementKind, ReadonlySet<string>> = {
  image: new Set(['img', 'Image', 'motion.img']),
  video: new Set(['video', 'motion.video']),
  audio: new Set(['audio', 'motion.audio']),
};

export function mediaNodeAcceptsKind(
  nodeType: string | undefined,
  kind: ToolbarMediaElementKind,
): boolean {
  return Boolean(nodeType && MEDIA_NODE_TYPES[kind].has(nodeType));
}

/**
 * Toolbar Media replaces source only when intent is unambiguous:
 * exactly one selected node and that node already represents the chosen
 * media kind. Everything else remains insertion.
 */
export function resolveToolbarMediaPlacement(
  selectedIds: readonly string[],
  kind: ToolbarMediaElementKind,
  getNodeType: (nodeId: string) => string | undefined,
): ToolbarMediaPlacement {
  if (selectedIds.length !== 1) return { type: 'insert' };

  const nodeId = selectedIds[0];
  return mediaNodeAcceptsKind(getNodeType(nodeId), kind)
    ? { type: 'replace', nodeId }
    : { type: 'insert' };
}
