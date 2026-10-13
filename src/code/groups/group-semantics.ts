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
  // Selection state should already be unique, but the semantic command is a
  // public boundary used by shortcuts/palette/future callers. Treat duplicate
  // ids as an invalid selection rather than queueing the same node twice.
  if (new Set(nodeIds).size !== nodeIds.length) return false;

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

export const NATIVE_GROUP_FLOW_STATE_ATTR = 'data-field-group-flow';

type FlowStateValue = string | null;

interface NativeGroupFlowChildState {
  before: Record<string, FlowStateValue>;
  baked: Record<string, FlowStateValue>;
}

interface NativeGroupFlowStatePayload {
  v: 1;
  children: Record<string, NativeGroupFlowChildState>;
}

const GROUP_FLOW_BAKE_KEYS = new Set([
  'position', 'left', 'top', 'right', 'bottom',
  'width', 'height',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'flex', 'flexGrow', 'flexShrink', 'flexBasis',
  'alignSelf', 'order',
]);

function normalizedFlowValue(value: string | undefined): FlowStateValue {
  return value == null || value === '' ? null : value;
}

function decodeNativeGroupFlowState(raw: string | undefined): NativeGroupFlowStatePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<NativeGroupFlowStatePayload>;
    if (parsed.v !== 1 || !parsed.children || typeof parsed.children !== 'object') return null;
    return parsed as NativeGroupFlowStatePayload;
  } catch {
    return null;
  }
}

export function encodeNativeGroupFlowState(
  entries: ReadonlyArray<{ node: CanvasNode; bakedStyles: Record<string, string> }>,
): string | null {
  const children: Record<string, NativeGroupFlowChildState> = {};

  for (const { node, bakedStyles } of entries) {
    const before: Record<string, FlowStateValue> = {};
    const baked: Record<string, FlowStateValue> = {};

    for (const key of Object.keys(bakedStyles)) {
      if (!GROUP_FLOW_BAKE_KEYS.has(key)) continue;
      const oldValue = normalizedFlowValue(node.styles?.[key]);
      const bakedValue = normalizedFlowValue(bakedStyles[key]);
      if (oldValue === bakedValue) continue;
      before[key] = oldValue;
      baked[key] = bakedValue;
    }

    if (Object.keys(baked).length > 0) {
      children[node.id] = { before, baked };
    }
  }

  if (Object.keys(children).length === 0) return null;
  return encodeURIComponent(JSON.stringify({ v: 1, children } satisfies NativeGroupFlowStatePayload));
}

export function planNativeGroupFlowRestore(
  group: CanvasNode,
  nodes: Map<string, CanvasNode>,
): Map<string, Record<string, string>> {
  const payload = decodeNativeGroupFlowState(group.attrs?.[NATIVE_GROUP_FLOW_STATE_ATTR]);
  const out = new Map<string, Record<string, string>>();
  if (!payload) return out;

  for (const childId of group.children) {
    const child = nodes.get(childId);
    const saved = payload.children[childId];
    if (!child || !saved) continue;

    const untouched = Object.entries(saved.baked).every(
      ([key, value]) => normalizedFlowValue(child.styles?.[key]) === value,
    );
    if (!untouched) continue;

    const patch: Record<string, string> = {};
    for (const [key, value] of Object.entries(saved.before)) {
      patch[key] = value == null ? '' : value;
    }
    if (Object.keys(patch).length > 0) out.set(childId, patch);
  }

  return out;
}

export function remapNativeGroupFlowState(
  raw: string,
  mapId: (oldId: string) => string | undefined,
): string {
  const payload = decodeNativeGroupFlowState(raw);
  if (!payload) return raw;

  const children: Record<string, NativeGroupFlowChildState> = {};
  for (const [oldId, state] of Object.entries(payload.children)) {
    children[mapId(oldId) ?? oldId] = state;
  }
  return encodeURIComponent(JSON.stringify({ v: 1, children } satisfies NativeGroupFlowStatePayload));
}
