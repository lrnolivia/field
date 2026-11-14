import type { Mutation } from '@/code/mutation/mutation-queue';
import type { CanvasNode } from '@/code/parsing/parser';
import { getNodeFromCache } from '@/code/stores/store';
import {
  buildPatternFillStyles,
  parsePatternFillConfig,
  serializePatternFillConfig,
  decodePatternStyleBackup,
  isLegacyGridMask,
  LEGACY_GRID_MASK,
  PATTERN_STYLE_BACKUP,
  type PatternFillConfig,
  type PatternMonsterDefinition,
} from './pattern-fill-utils';

const SHADER_STYLE_BACKUP = 'data-field-shader-style-backup';

const MASK_PROPERTIES = ['maskImage', 'WebkitMaskImage'] as const;
const SHADER_HOST_STYLES = { position: 'relative', isolation: 'isolate' };

function readBackup(node: CanvasNode | undefined | null, attr: string): Record<string, string> | null {
  const raw = node?.attrs?.[attr];
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, string> : null;
  } catch {
    return null;
  }
}

// URI encoding keeps quotes and replacement-template sequences out of JSX attributes.
function encodeBackup(styles: Record<string, string>): string {
  return Object.keys(styles).length ? encodeURIComponent(JSON.stringify(styles)).replace(/'/g, '%27') : '';
}

function restoreOwnedStyles(
  node: CanvasNode | undefined | null,
  installed: Record<string, string>,
  backup: Record<string, string>,
): Record<string, string> {
  const styles: Record<string, string> = {};
  for (const [prop, value] of Object.entries(installed)) {
    if (typeof backup[prop] === 'string' && node?.styles[prop] === value) styles[prop] = backup[prop];
  }
  return styles;
}

function patternMaskRestore(node: CanvasNode | undefined | null): Record<string, string> {
  const raw = node?.attrs?.['data-field-pattern'];
  if (!raw) return {};
  const config = parsePatternFillConfig(raw);
  if (!isLegacyGridMask(config, node?.styles.backgroundImage)) return {};
  const backup = decodePatternStyleBackup(node?.attrs?.[PATTERN_STYLE_BACKUP]);
  const restore: Record<string, string> = {};
  for (const property of MASK_PROPERTIES) {
    if (node?.styles[property] !== LEGACY_GRID_MASK) continue;
    const prior = backup[property];
    restore[property] = typeof prior === 'string' ? prior : '';
  }
  return restore;
}

export function patternFillMutations(
  nodeId: string,
  node: CanvasNode | undefined | null,
  config: PatternFillConfig,
  definition?: PatternMonsterDefinition | null,
): Mutation[] {
  const background = buildPatternFillStyles(config, definition);
  return [
    {
      type: 'updateStyles',
      nodeId,
      styles: {
        background: '',
        ...background,
        backgroundAttachment: '',
        ...patternMaskRestore(node),
      },
    },
    {
      type: 'updateHtmlAttrs',
      nodeId,
      attrs: {
        'data-field-pattern': serializePatternFillConfig(config),
        [PATTERN_STYLE_BACKUP]: '',
      },
    },
  ];
}

export function removePatternFillMutations(node: CanvasNode): Mutation[] {
  if (!node.attrs?.['data-field-pattern']) return [];
  const restore = patternMaskRestore(node);
  const mutations: Mutation[] = [{
    type: 'updateHtmlAttrs',
    nodeId: node.id,
    attrs: { 'data-field-pattern': '', [PATTERN_STYLE_BACKUP]: '' },
  }];
  if (Object.keys(restore).length) mutations.push({ type: 'updateStyles', nodeId: node.id, styles: restore });
  return mutations;
}

export function shaderFillHostMutations(node: CanvasNode, tag: string): Mutation[] {
  const restore = restoreOwnedStyles(node, SHADER_HOST_STYLES, readBackup(node, SHADER_STYLE_BACKUP) ?? {});
  const hostStyles = { ...node.styles, ...restore };
  const position = hostStyles.position?.trim();
  const plannedStyles = {
    ...(!position || position === 'static' ? { position: SHADER_HOST_STYLES.position } : {}),
    ...(hostStyles.isolation !== 'isolate' ? { isolation: SHADER_HOST_STYLES.isolation } : {}),
  };
  const backup = Object.fromEntries(Object.keys(plannedStyles).map(prop => [prop, hostStyles[prop] ?? '']));
  const styles = { ...restore, ...plannedStyles };
  const mutations: Mutation[] = [{
    type: 'updateHtmlAttrs',
    nodeId: node.id,
    attrs: { 'data-field-shader-fill': tag, [SHADER_STYLE_BACKUP]: encodeBackup(backup) },
  }];
  if (Object.keys(styles).length) mutations.push({ type: 'updateStyles', nodeId: node.id, styles });
  return mutations;
}

export function removeShaderFillMutations(node: CanvasNode): Mutation[] {
  const mutations: Mutation[] = [];
  if (node.attrs?.['data-field-shader-fill']) {
    const styles = restoreOwnedStyles(node, SHADER_HOST_STYLES, readBackup(node, SHADER_STYLE_BACKUP) ?? {});
    if (Object.keys(styles).length) mutations.push({ type: 'updateStyles', nodeId: node.id, styles });
    mutations.push({
      type: 'updateHtmlAttrs',
      nodeId: node.id,
      attrs: { 'data-field-shader-fill': '', [SHADER_STYLE_BACKUP]: '' },
    });
  }
  for (const childId of node.children) {
    if (getNodeFromCache(childId)?.attrs?.['data-field-shader-layer'] === 'true') {
      mutations.push({ type: 'removeNode', nodeId: childId });
    }
  }
  return mutations;
}
