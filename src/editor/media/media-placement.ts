import type { CanvasNode } from '@/code/parsing/parser';

export type ToolbarMediaElementKind = 'image' | 'video' | 'audio';

export type ToolbarMediaPlacement =
  | { type: 'insert' }
  | { type: 'inside'; nodeId: string }
  | { type: 'replace'; nodeId: string };

const MEDIA_NODE_TYPES: Record<ToolbarMediaElementKind, ReadonlySet<string>> = {
  image: new Set(['img', 'Image', 'motion.img']),
  video: new Set(['video', 'motion.video']),
  audio: new Set(['audio', 'motion.audio']),
};

const MEDIA_CONTAINER_TYPES = new Set([
  'div', 'section', 'main', 'article', 'aside', 'header', 'footer', 'nav',
  'figure', 'figcaption', 'form', 'ul', 'ol', 'li',
  'motion.div', 'motion.section', 'motion.main', 'motion.article',
  'motion.aside', 'motion.header', 'motion.footer', 'motion.nav',
  'motion.figure', 'motion.form', 'motion.ul', 'motion.ol', 'motion.li',
]);

export function mediaNodeAcceptsChild(nodeType: string | undefined): boolean {
  return Boolean(nodeType && MEDIA_CONTAINER_TYPES.has(nodeType));
}

type GalleryContainer = Pick<CanvasNode, 'id' | 'type' | 'isCanvasNode' | 'parentId' | 'fromLayout'>;

export function resolveDesktopGalleryTarget<T extends GalleryContainer>(
  selected: T | undefined,
  nodes: Iterable<T>,
): T | undefined {
  if (selected && !selected.isCanvasNode && !selected.fromLayout && mediaNodeAcceptsChild(selected.type)) return selected;
  let firstRoot: T | undefined;
  for (const node of nodes) {
    if (node.isCanvasNode || node.parentId || !mediaNodeAcceptsChild(node.type)) continue;
    if (node.id === 'root') return node;
    firstRoot ??= node;
  }
  return firstRoot;
}

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
  const nodeType = getNodeType(nodeId);
  if (mediaNodeAcceptsKind(nodeType, kind)) return { type: 'replace', nodeId };
  if (mediaNodeAcceptsChild(nodeType)) return { type: 'inside', nodeId };
  return { type: 'insert' };
}
