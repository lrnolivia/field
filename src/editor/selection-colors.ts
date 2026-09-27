import type { CanvasNode } from '@/code/parsing/parser';
import { parseGradient, formatGradient } from '@/shared/gradient-utils';
import { parseBorderShorthand, formatBorderShorthand } from '@/editor/ui/border-utils';

export type SelectionColorTarget =
  | {
      kind: 'property';
      nodeId: string;
      property: string;
    }
  | {
      kind: 'gradient-stop';
      nodeId: string;
      property: 'background' | 'backgroundImage';
      stopIndex: number;
      sourceValue: string;
    }
  | {
      kind: 'border-shorthand';
      nodeId: string;
      property: 'border' | 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft';
      sourceValue: string;
    };

export interface SelectionColorGroup {
  value: string;
  targets: SelectionColorTarget[];
  nodeIds: string[];
}

type NodeResolver = (id: string) => CanvasNode | undefined;

const EMPTY_VALUES = new Set([
  '', 'transparent', 'rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)', 'none', 'currentcolor',
]);

const DIRECT_COLOR_PROPERTIES = [
  'backgroundColor',
  'color',
  'WebkitTextFillColor',
  'fill',
  'stroke',
] as const;

const BORDER_SIDE_COLOR_PROPERTIES = [
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
] as const;

function defaultResolver(nodes: Map<string, CanvasNode>): NodeResolver {
  return (id) => nodes.get(id);
}

export function collectSelectionScopeIds(
  selectedIds: string[],
  nodes: Map<string, CanvasNode>,
  resolveNode: NodeResolver = defaultResolver(nodes),
): string[] {
  const visited = new Set<string>();
  const stack = [...selectedIds].reverse();

  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || visited.has(id) || id.includes(':')) continue;
    const node = resolveNode(id) ?? nodes.get(id);
    if (!node) continue;

    visited.add(id);
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      const childId = node.children[i];
      if (!visited.has(childId) && !childId.includes(':')) stack.push(childId);
    }
  }

  return Array.from(visited);
}

function targetKey(target: SelectionColorTarget): string {
  if (target.kind === 'property') return `${target.nodeId}:property:${target.property}`;
  if (target.kind === 'gradient-stop') return `${target.nodeId}:gradient:${target.property}:${target.stopIndex}`;
  return `${target.nodeId}:border:${target.property}`;
}

export function aggregateSelectionColors(
  selectedIds: string[],
  nodes: Map<string, CanvasNode>,
  resolveNode: NodeResolver = defaultResolver(nodes),
): SelectionColorGroup[] {
  const scopeIds = collectSelectionScopeIds(selectedIds, nodes, resolveNode);
  const groups = new Map<string, { value: string; targets: SelectionColorTarget[]; keys: Set<string> }>();

  const collect = (raw: string | undefined, target: SelectionColorTarget) => {
    const value = raw?.trim() ?? '';
    if (!value || EMPTY_VALUES.has(value.toLowerCase())) return;
    const key = value.startsWith('var(') ? value : value.toLowerCase();
    const targetId = targetKey(target);
    const existing = groups.get(key);
    if (existing) {
      if (!existing.keys.has(targetId)) {
        existing.keys.add(targetId);
        existing.targets.push(target);
      }
      return;
    }
    groups.set(key, { value, targets: [target], keys: new Set([targetId]) });
  };

  for (const id of scopeIds) {
    const node = resolveNode(id) ?? nodes.get(id);
    if (!node) continue;
    const styles = node.styles ?? {};

    for (const property of DIRECT_COLOR_PROPERTIES) {
      collect(styles[property], { kind: 'property', nodeId: id, property });
    }

    if (styles.borderColor) {
      collect(styles.borderColor, { kind: 'property', nodeId: id, property: 'borderColor' });
    } else {
      for (const property of BORDER_SIDE_COLOR_PROPERTIES) {
        if (styles[property]) collect(styles[property], { kind: 'property', nodeId: id, property });
      }
    }

    for (const property of ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'] as const) {
      const sourceValue = styles[property];
      if (!sourceValue || sourceValue === 'none') continue;
      const parsed = parseBorderShorthand(sourceValue);
      if (parsed.width <= 0 || parsed.style === 'none') continue;
      collect(parsed.color, { kind: 'border-shorthand', nodeId: id, property, sourceValue });
    }

    for (const property of ['background', 'backgroundImage'] as const) {
      const sourceValue = styles[property];
      if (!sourceValue) continue;
      const gradient = parseGradient(sourceValue);
      if (!gradient) continue;
      gradient.stops.forEach((stop, stopIndex) => {
        collect(stop.color, { kind: 'gradient-stop', nodeId: id, property, stopIndex, sourceValue });
      });
    }
  }

  return Array.from(groups.values())
    .map(({ value, targets }) => ({
      value,
      targets,
      nodeIds: Array.from(new Set(targets.map((target) => target.nodeId))),
    }))
    .sort((a, b) => b.targets.length - a.targets.length || a.value.localeCompare(b.value));
}

export function buildColorReplacementStyles(
  targets: SelectionColorTarget[],
  nextColor: string,
): Map<string, Record<string, string>> {
  const byNode = new Map<string, Record<string, string>>();
  const gradients = new Map<string, SelectionColorTarget[]>();
  const borders: SelectionColorTarget[] = [];

  const ensure = (nodeId: string) => {
    const styles = byNode.get(nodeId) ?? {};
    byNode.set(nodeId, styles);
    return styles;
  };

  for (const target of targets) {
    if (target.kind === 'property') {
      ensure(target.nodeId)[target.property] = nextColor;
    } else if (target.kind === 'gradient-stop') {
      const key = `${target.nodeId}:${target.property}:${target.sourceValue}`;
      const list = gradients.get(key) ?? [];
      list.push(target);
      gradients.set(key, list);
    } else {
      borders.push(target);
    }
  }

  for (const list of gradients.values()) {
    const first = list[0];
    if (!first || first.kind !== 'gradient-stop') continue;
    const gradient = parseGradient(first.sourceValue);
    if (!gradient) continue;
    for (const target of list) {
      if (target.kind !== 'gradient-stop') continue;
      if (gradient.stops[target.stopIndex]) {
        gradient.stops[target.stopIndex] = { ...gradient.stops[target.stopIndex], color: nextColor };
      }
    }
    ensure(first.nodeId)[first.property] = formatGradient(gradient);
  }

  for (const target of borders) {
    if (target.kind !== 'border-shorthand') continue;
    const parsed = parseBorderShorthand(target.sourceValue);
    ensure(target.nodeId)[target.property] = formatBorderShorthand({ ...parsed, color: nextColor });
  }

  return byNode;
}
