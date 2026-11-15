import * as t from '@babel/types';
import type { ViewportConfig } from '@/shared/types';
import { extractStyleCSS, parseJSXToNodes } from '../parsing/parser';
import { findFirstElementByDataId, parseJSX } from '../parsing/ast-utils';
import { parseContainerRules } from '../stores/container-query-store';
import { addNodeInCode, updateNodeInCode } from './generator-crud';
import { updateContainerQueryStyle } from './generator-styles';
import { buildBgVideoElement, DEFAULT_BG_VIDEO_OPTS, patchBgVideo, type BgVideoOpts } from './generator-video';
import { ensureMediaGate, ensureMediaQueryHook, sweepOrphanMediaGates } from './scoped-expr';
import { generate } from './generator-utils';
import {
  BREAKPOINT_FILLS_ATTR, FILL_VIEWPORT_ATTR, FILL_VIEWPORT_PREFIX,
  breakpointVideo, readBreakpointFills, type BreakpointFill, type FillMap,
} from '@/shared/managed-fill-breakpoints';

export interface FillBreakpoint {
  /** Empty on the primary tile, so the primary remains the Preview fallback. */
  id: string;
  width: number;
}

export type BreakpointFillEdit =
  | { kind: 'pattern'; recipe: string; styles: Record<string, string> }
  | { kind: 'shader'; tag: string }
  | { kind: 'shader-prop'; name: string; value: string; expression: boolean }
  | { kind: 'video'; options: BgVideoOpts }
  | { kind: 'clear'; styles?: Record<string, string> };

const PAINT_RESET = {
  background: '',
  backgroundColor: '',
  backgroundImage: '',
  backgroundSize: '',
  backgroundPosition: '',
  backgroundRepeat: '',
  backgroundAttachment: '',
  backgroundBlendMode: '',
};


function attr(element: t.JSXElement, name: string): t.JSXAttribute | undefined {
  return element.openingElement.attributes.find((item): item is t.JSXAttribute =>
    t.isJSXAttribute(item) && t.isJSXIdentifier(item.name, { name }));
}

function stringAttr(element: t.JSXElement, name: string): string | undefined {
  const value = attr(element, name)?.value;
  return t.isStringLiteral(value) ? value.value : undefined;
}

function layerViewport(element: t.JSXElement): string | undefined {
  return stringAttr(element, FILL_VIEWPORT_ATTR)?.slice(FILL_VIEWPORT_PREFIX.length);
}

function writeStringAttr(element: t.JSXElement, name: string, value: string): void {
  const current = attr(element, name);
  if (current) current.value = t.stringLiteral(value);
  else element.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier(name), t.stringLiteral(value)));
}

function fillChild(child: t.JSXElement['children'][number]): t.JSXElement | undefined {
  const candidate = t.isJSXExpressionContainer(child) && t.isLogicalExpression(child.expression, { operator: '&&' })
    ? child.expression.right
    : child;
  if (!t.isJSXElement(candidate)) return;
  if (attr(candidate, 'data-bg-video') || stringAttr(candidate, 'data-field-shader-layer') === 'true') return candidate;
}

function cssKey(key: string): string {
  return key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
}

function effectiveStyles(base: Record<string, string>, rule?: Map<string, string>): Record<string, string> {
  if (!rule) return base;
  return { ...base, ...Object.fromEntries(Array.from(rule, ([key, value]) =>
    [key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), value])) };
}

/** Writing inline for the primary changes the fallback for every replica.
 * Pin each affected replica to its previous value before making that write. */
export function writeBreakpointFillStyles(
  code: string, nodeId: string, target: FillBreakpoint, replicas: FillBreakpoint[], styles: Record<string, string>,
  base = parseJSXToNodes(code).get(nodeId)?.styles ?? {},
): string {
  if (!Object.keys(styles).length) return code;
  // Bound any older open-ended rules before changing their paint. Otherwise
  // the container writer may copy the new values into a formerly covered band.
  if (extractStyleCSS(code)) code = updateContainerQueryStyle(code, nodeId, target.width, {});
  const cssValue = (value: string | undefined) => value || 'initial';
  if (target.id !== '') {
    return updateContainerQueryStyle(code, nodeId, target.width, Object.fromEntries(
      Object.entries(styles).map(([key, value]) => [key, cssValue(value)]),
    ));
  }
  const rules = parseContainerRules(extractStyleCSS(code));
  let next = code;
  for (const { width } of replicas) {
    const existing = rules.get(width)?.get(nodeId);
    const preserve: Record<string, string> = {};
    for (const key of Object.keys(styles)) {
      if (existing?.has(cssKey(key))) continue;
      // An explicit replica shorthand owns the corresponding longhands.
      if (key !== 'background' && key.startsWith('background') && existing?.has('background')) continue;
      // Preserving the old shorthand also preserves any longhands it supplied.
      if (key !== 'background' && key.startsWith('background') && base.background && !base[key] && 'background' in styles) continue;
      preserve[key] = cssValue(base[key]);
    }
    if (Object.keys(preserve).length) next = updateContainerQueryStyle(next, nodeId, width, preserve);
  }
  return updateNodeInCode(next, nodeId, styles);
}

function shaderId(nodeId: string, target: FillBreakpoint): string {
  return `${nodeId}__shader_fill_${encodeURIComponent(target.id || 'primary')}`;
}

function prepareFillGates(code: string, replicas: FillBreakpoint[]) {
  const bands = [...replicas].sort((a, b) => b.width - a.width);
  const gates = bands.map(band => {
    const gate = ensureMediaGate(code, `(max-width: ${band.width}px)`);
    code = gate.code;
    return { ...band, gate: gate.gateVar };
  });
  return { code, gates };
}

function writeFillLayers(
  host: t.JSXElement, fills: FillMap, layers: t.JSXElement[], gates: ReturnType<typeof prepareFillGates>['gates'],
): void {
  writeStringAttr(host, BREAKPOINT_FILLS_ATTR, encodeURIComponent(JSON.stringify(fills)).replace(/'/g, '%27'));
  const children = layers.map(layer => {
    const layerScope = layerViewport(layer);
    const matches = (id: string) => layerScope === undefined ? !fills[id] : layerScope === id;
    let condition: t.Expression = t.booleanLiteral(matches(''));
    for (const band of gates) {
      condition = t.conditionalExpression(t.identifier(band.gate), t.booleanLiteral(matches(band.id)), condition);
    }
    if (t.isBooleanLiteral(condition, { value: true })) return layer;
    return t.jsxExpressionContainer(t.logicalExpression('&&', condition, layer));
  });
  if (children.length && host.openingElement.selfClosing) {
    host.openingElement.selfClosing = false;
    host.closingElement = t.jsxClosingElement(t.cloneNode(host.openingElement.name));
  }
  host.children = [...children, ...host.children.filter(child => !fillChild(child))];
}

function finishFillSource(ast: t.File, code: string): string {
  const next = sweepOrphanMediaGates(generate(ast, { retainLines: true }, code).code);
  return /const\s+__mq\d+\s*=\s*useMediaQuery\(/.test(next) ? ensureMediaQueryHook(next) : next;
}

function childLayers(host: t.JSXElement): t.JSXElement[] {
  return host.children.flatMap(child => {
    const layer = fillChild(child);
    return layer ? [layer] : [];
  });
}

/** Rebuild runtime conditions when the page's authored breakpoints change. */
export function syncManagedFillBreakpoints(code: string, viewports: ViewportConfig[]): string {
  if (!code.includes(BREAKPOINT_FILLS_ATTR)) return code;
  const primary = viewports.find(viewport => viewport.isPrimary) ?? viewports[0];
  if (!primary) return code;
  const styledHosts = Array.from(parseJSXToNodes(code).values())
    .filter(node => node.attrs?.[BREAKPOINT_FILLS_ATTR]);
  if (styledHosts.length === 0) return code;
  const replicas = viewports.filter(viewport => viewport !== primary);
  const valid = new Set(['', ...replicas.map(viewport => viewport.id)]);
  const prepared = prepareFillGates(code, replicas);
  const ast = parseJSX(prepared.code);
  if (!ast) return code;
  for (const node of styledHosts) {
    findFirstElementByDataId(ast, node.id, path => {
      const host = path.node as t.JSXElement;
      const fills = readBreakpointFills(stringAttr(host, BREAKPOINT_FILLS_ATTR));
      for (const id of Object.keys(fills)) {
        if (!valid.has(id)) delete fills[id];
      }
      const layers = childLayers(host).filter(layer => valid.has(layerViewport(layer) ?? ''));
      writeFillLayers(host, fills, layers, prepared.gates);
    });
  }
  return finishFillSource(ast, prepared.code);
}

/** Source retains legacy managed layers as the fallback. Each edited tile owns
 * one slot. The runtime mounts the chosen child, so hidden videos cannot play. */
export function editBreakpointFill(
  code: string, nodeId: string, target: FillBreakpoint, replicas: FillBreakpoint[], edit: BreakpointFillEdit,
): string {
  const node = parseJSXToNodes(code).get(nodeId);
  if (!node) return code;
  const fills = readBreakpointFills(node.attrs?.[BREAKPOINT_FILLS_ATTR]);
  const old = fills[target.id];
  const actualKind = edit.kind === 'shader-prop' ? 'shader' : edit.kind === 'clear' ? 'none' : edit.kind;
  if (edit.kind === 'video' && !edit.options.src && !breakpointVideo(node, target.id)) return code;
  const nextFill: BreakpointFill = edit.kind === 'pattern'
    ? { kind: 'pattern', recipe: edit.recipe }
    : { kind: actualKind } as BreakpointFill;
  const installingChild = actualKind === 'shader' || actualKind === 'video';
  const wasChild = old?.kind === 'shader' || old?.kind === 'video';
  const rule = target.id ? parseContainerRules(extractStyleCSS(code)).get(target.width)?.get(nodeId) : undefined;
  const current = effectiveStyles(node.styles, rule);
  const styles: Record<string, string> = edit.kind === 'pattern' ? { ...PAINT_RESET, ...edit.styles }
    : edit.kind === 'clear' ? { ...PAINT_RESET, ...edit.styles }
    : (edit.kind === 'video' && !edit.options.src) || edit.kind === 'shader-prop' ? {} : { ...PAINT_RESET };
  const backup: Record<string, string> = { ...old?.hostStyleBackup };
  if (!old) {
    const legacyShaderBackup = node.attrs?.['data-field-shader-style-backup'];
    if (legacyShaderBackup) {
      try { Object.assign(backup, JSON.parse(decodeURIComponent(legacyShaderBackup))); } catch { /* older hand-edited source */ }
    }
    for (const key of node.bgVideo?.ownedHostStyles ?? []) backup[key] = '';
  }
  if (installingChild) {
    if (!current.position || current.position === 'static' || current.position === 'initial') {
      backup.position ??= current.position ?? '';
      styles.position = 'relative';
    }
    if (current.isolation !== 'isolate') {
      backup.isolation ??= current.isolation ?? '';
      styles.isolation = 'isolate';
    }
    if (Object.keys(backup).length) nextFill.hostStyleBackup = backup;
  } else if (wasChild || Object.keys(backup).length) {
    if (backup.position !== undefined && current.position === 'relative') styles.position = backup.position;
    if (backup.isolation !== undefined && current.isolation === 'isolate') styles.isolation = backup.isolation;
  }
  fills[target.id] = nextFill;

  let next = code;
  if (edit.kind === 'shader') {
    next = addNodeInCode(next, nodeId, {
      id: shaderId(nodeId, target) + '__pending',
      name: 'Shader Fill',
      type: edit.tag,
      attrs: { 'data-field-shader-layer': 'true' },
      styles: {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        borderRadius: 'inherit', overflow: 'hidden', zIndex: '-1', pointerEvents: 'none',
      },
    }, 0);
  }

  const prepared = prepareFillGates(next, replicas);
  next = prepared.code;
  const ast = parseJSX(next);
  if (!ast) return code;
  let found = false;
  findFirstElementByDataId(ast, nodeId, path => {
    const host = path.node as t.JSXElement;
    const originalLayers = childLayers(host);
    const legacy = (kind: 'shader' | 'video') => originalLayers.find(layer =>
      layerViewport(layer) === undefined
      && (kind === 'video' ? !!attr(layer, 'data-bg-video') : !!attr(layer, 'data-field-shader-layer')));
    const scoped = originalLayers.find(layer => layerViewport(layer) === target.id);
    let replacement: t.JSXElement | undefined;
    if (edit.kind === 'shader') {
      // addNodeInCode inserts this exact instance before any previous layer.
      replacement = originalLayers.find(layer => stringAttr(layer, 'data-id') === shaderId(nodeId, target) + '__pending');
      if (replacement) writeStringAttr(replacement, 'data-id', shaderId(nodeId, target));
    } else if (edit.kind === 'shader-prop') {
      const currentLayer = scoped ?? (!old ? legacy('shader') : undefined);
      if (!currentLayer) return;
      replacement = t.cloneNode(currentLayer, true);
      writeStringAttr(replacement, 'data-id', shaderId(nodeId, target));
      let value: t.JSXAttribute['value'] = t.stringLiteral(edit.value);
      if (edit.expression) {
        const expression = parseJSX(`(${edit.value})`)?.program.body[0];
        if (!t.isExpressionStatement(expression)) return;
        value = t.jsxExpressionContainer(expression.expression);
      }
      const prior = attr(replacement, edit.name);
      if (prior) prior.value = value;
      else replacement.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier(edit.name), value));
    } else if (edit.kind === 'video') {
      const currentLayer = scoped && attr(scoped, 'data-bg-video') ? scoped : !old ? legacy('video') : undefined;
      if (currentLayer) {
        replacement = t.cloneNode(currentLayer, true);
        patchBgVideo(replacement.openingElement, edit.options);
      } else if (edit.options.src) {
        replacement = buildBgVideoElement({ ...DEFAULT_BG_VIDEO_OPTS, ...edit.options, src: edit.options.src });
      }
    }
    if (installingChild && !replacement) return;
    if (replacement) writeStringAttr(replacement, FILL_VIEWPORT_ATTR, FILL_VIEWPORT_PREFIX + target.id);
    const layers = originalLayers.filter(layer => layer !== replacement && layer !== scoped);
    if (replacement) layers.unshift(replacement);
    writeFillLayers(host, fills, layers, prepared.gates);
    found = true;
  });
  if (!found) return code;
  next = finishFillSource(ast, next);
  return writeBreakpointFillStyles(next, nodeId, target, replicas, styles, node.styles);
}
