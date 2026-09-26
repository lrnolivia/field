// scale-operation.ts — first-class proportional Scale operation for field.
//
// Architecture:
//   immutable snapshot -> uniform scalar/anchor -> DOM-only live preview
//   -> one authored commit batch -> Group refit -> one mutation flush.
//
// Resize semantics are intentionally not imported here.

import type { CanvasNode } from '@/code/parsing/parser';
import { getCachedNodesMap, getNodesSnapshot } from '@/code/stores/store';
import { flushNow, queueMutation } from '@/code/mutation/mutation-queue';
import { planNativeGroupRefit, planNativeGroupRefitChain } from '@/code/groups/group-refit';
import {
  findNodeComputedStyles,
  forceCanvasRender,
  getContentRoot,
  getViewportPrefix,
  updateNodeStyles,
} from '@/canvas/node-ops';
import { getScreenCornersById, type ScreenCorners } from '@/canvas/resize/geometry-utils';
import { transformManager } from '@/canvas/transform';
import { trace } from '@/shared/debug-trace';
import {
  MIN_SCALE_FACTOR,
  anchorPoint,
  canonicalizeScaleRoots,
  formatScalePx,
  oppositeAnchorForCorner,
  scaleFactorFromPointer,
  scalePoint,
  type ScaleAnchor,
  type ScaleBox,
  type ScaleCornerDirection,
  type ScalePoint,
} from './scale-math';
import {
  classifyScaleValue,
  parseAuthoredPx,
  planScaledStyles,
  planScaledSvgShapeAttrs,
  scaleSvgViewBox,
  scalableBoundProperties,
  unsafeScaleChannelProperties,
} from './scale-policy';

export interface ScaleTarget {
  id: string;
  vpId: string;
}

export interface ScaleSelectionMeasurement {
  box: ScaleBox;
  width: number;
  height: number;
}

export type ScaleResult =
  | { ok: true; factor: number; affected: number }
  | { ok: false; reason: string };

type ScaleBlockedResult = Extract<ScaleResult, { ok: false }>;

interface RootGeometry {
  id: string;
  vpId: string;
  vpPrefix: string;
  oldLeft: number;
  oldTop: number;
  oldWidth: number;
  oldHeight: number;
  visualCenterScreen: ScalePoint;
}

interface ScaleSvgLeafChildSnapshot {
  childIndex: number;
  tag: string;
  attrs: Record<string, string>;
}

interface ScaleSvgLeafSnapshot {
  viewBox: string;
  children: ScaleSvgLeafChildSnapshot[];
}

interface ScaleNodeSnapshot {
  id: string;
  vpId: string;
  vpPrefix: string;
  styles: Record<string, string>;
  isRoot: boolean;
  isGroup: boolean;
  svgLeaf?: ScaleSvgLeafSnapshot;
  groupWidth?: number;
  groupHeight?: number;
}

interface ScaleSnapshot {
  roots: string[];
  vpId: string;
  vpPrefix: string;
  selectionBoxScreen: ScaleBox;
  anchorScreen: ScalePoint;
  cameraScale: number;
  nodes: ScaleNodeSnapshot[];
  rootGeometry: Map<string, RootGeometry>;
  groupIds: Set<string>;
}

const INTRINSIC_SIZE_KEYWORDS = new Set(['auto', 'fit-content', 'min-content', 'max-content']);
const GROUP_DERIVED_DIMENSIONS = [
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
] as const;
const SVG_GEOMETRY_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline']);

function baseNodeType(type: string | undefined): string {
  return (type ?? '').replace(/^motion\./, '').toLowerCase();
}

/** A native/imported SVG is one proportional coordinate system for LIVE Scale.
 *  During drag, scaling only the outer viewport gives the exact proportional
 *  preview without rewriting inner geometry every pointermove. At COMMIT,
 *  native shape children are baked into a proportionally enlarged viewBox too,
 *  so source geometry/strokes/radii become truthful authored metrics while the
 *  painted result remains identical. Opaque imported graphicMarkup stays an
 *  authored leaf until its internal markup has a safe mutation path. */
function isUniformSvgViewportLeaf(node: CanvasNode, nodes: ReadonlyMap<string, CanvasNode>): boolean {
  if (baseNodeType(node.type) !== 'svg') return false;
  if (node.graphicMarkup) return true;
  if (!node.children?.length) return false;
  return node.children.every((childId) => SVG_GEOMETRY_TAGS.has(baseNodeType(nodes.get(childId)?.type)));
}


function captureSvgLeafSnapshot(
  node: CanvasNode,
  nodes: ReadonlyMap<string, CanvasNode>,
): ScaleSvgLeafSnapshot | undefined {
  if (!isUniformSvgViewportLeaf(node, nodes) || node.graphicMarkup || !node.children?.length) return undefined;
  const viewBox = node.attrs?.viewBox?.trim();
  if (!viewBox) return undefined;
  const children: ScaleSvgLeafChildSnapshot[] = [];
  node.children.forEach((childId, childIndex) => {
    const child = nodes.get(childId);
    if (!child) return;
    children.push({
      childIndex,
      tag: baseNodeType(child.type),
      attrs: { ...(child.attrs ?? {}) },
    });
  });
  return children.length ? { viewBox, children } : undefined;
}

function hasSvgGroupChildren(node: CanvasNode, nodes: ReadonlyMap<string, CanvasNode>): boolean {
  return baseNodeType(node.type) === 'svg'
    && (node.children ?? []).some((childId) => baseNodeType(nodes.get(childId)?.type) === 'svg');
}

function finitePx(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function cornersBox(corners: ScreenCorners): ScaleBox {
  const pts = [corners.TL, corners.TR, corners.BR, corners.BL];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { left, top, width: right - left, height: bottom - top };
}

function cornersCenter(corners: ScreenCorners): ScalePoint {
  return {
    x: (corners.TL.x + corners.TR.x + corners.BR.x + corners.BL.x) / 4,
    y: (corners.TL.y + corners.TR.y + corners.BR.y + corners.BL.y) / 4,
  };
}

function unionScreenBoxes(boxes: ScaleBox[]): ScaleBox | null {
  if (!boxes.length) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const box of boxes) {
    left = Math.min(left, box.left);
    top = Math.min(top, box.top);
    right = Math.max(right, box.left + box.width);
    bottom = Math.max(bottom, box.top + box.height);
  }
  return [left, top, right, bottom].every(Number.isFinite)
    ? { left, top, width: right - left, height: bottom - top }
    : null;
}

function getUniqueViewport(targets: ScaleTarget[]): string | null {
  const set = new Set(targets.map((t) => t.vpId));
  return set.size === 1 ? (targets[0]?.vpId ?? null) : null;
}


function authoredRootOffsetIsRepresentable(value: string | undefined): boolean {
  // Root placement is rewritten as explicit px so the anchor math can be
  // deterministic. Do not silently flatten percentages, relative units,
  // variables or `auto` placement into pixels.
  if (value == null || value.trim() === '') return false;
  const cls = classifyScaleValue(value);
  return cls === 'px' || cls === 'zero';
}

function authoredSizeIsRepresentable(value: string | undefined): boolean {
  if (value == null || value.trim() === '') return true;
  const trimmed = value.trim().toLowerCase();
  if (INTRINSIC_SIZE_KEYWORDS.has(trimmed)) return true;
  const cls = classifyScaleValue(value);
  return cls === 'px' || cls === 'zero';
}

function authored2DTransformIsSafe(value: string | undefined): boolean {
  if (!value || value.trim() === '' || value.trim() === 'none') return true;
  if (/perspective\(|matrix3d\(|rotate[XY]\(|translateZ\(|translate3d\(|scale3d\(/i.test(value)) return false;
  if (/var\(|calc\(|min\(|max\(|clamp\(/i.test(value)) return false;
  return true;
}

function transformHasDimensionalTranslation(value: string | undefined): boolean {
  if (!value) return false;
  if (/translate(?:X|Y)?\(\s*[+-]?(?:\d+|\d*\.\d+)px/i.test(value)) return true;
  const m = /^\s*matrix\(([^)]*)\)\s*$/i.exec(value);
  if (!m) return false;
  const nums = m[1].split(',').map((part) => Number.parseFloat(part.trim()));
  return nums.length === 6 && nums.every(Number.isFinite) && (Math.abs(nums[4]) > 1e-9 || Math.abs(nums[5]) > 1e-9);
}

function sourceStyleEquivalent(a: string | undefined, b: string): boolean {
  if ((a ?? '') === b) return true;
  const apx = parseAuthoredPx(a);
  const bpx = parseAuthoredPx(b);
  return apx != null && bpx != null && Math.abs(apx - bpx) <= 0.5;
}

function validGroupBaseline(groupId: string, nodes: Map<string, CanvasNode>): boolean {
  const plan = planNativeGroupRefit(groupId, new Map(nodes));
  if (!plan) return false;
  for (const patch of plan.patches) {
    const node = nodes.get(patch.nodeId);
    if (!node) return false;
    for (const [key, value] of Object.entries(patch.styles)) {
      if (!sourceStyleEquivalent(node.styles?.[key], value)) return false;
    }
  }
  return true;
}

function hasUnsafeAncestorTransform(root: CanvasNode, nodes: ReadonlyMap<string, CanvasNode>, selected: Set<string>): boolean {
  let parentId = root.parentId;
  const seen = new Set<string>();
  while (parentId) {
    if (selected.has(parentId)) return false;
    if (seen.has(parentId)) return true;
    seen.add(parentId);
    const parent = nodes.get(parentId);
    if (!parent) return false;
    const transform = parent.styles?.transform?.trim();
    if (transform && transform !== 'none') return true;
    if (unsafeScaleChannelProperties(parent as any).some((key) => key.endsWith(':transform'))) return true;
    parentId = parent.parentId;
  }
  return false;
}

function validateNodeSemantics(node: CanvasNode, isRoot: boolean, nodes: ReadonlyMap<string, CanvasNode>): string | null {
  if (node.fromLayout) return `${node.id}:locked-layout-node`;
  if (node.isComponentInstance || node.componentInstanceId) return `${node.id}:component-instance-boundary`;
  if (hasSvgGroupChildren(node, nodes)) return `${node.id}:svg-group-scale-needs-geometry-bake`;
  if (isUniformSvgViewportLeaf(node, nodes)) {
    const viewBox = node.attrs?.viewBox?.trim();
    const parts = viewBox ? viewBox.split(/[\s,]+/).map(Number) : [];
    if (parts.length !== 4 || !parts.every(Number.isFinite) || parts[2] <= 0 || parts[3] <= 0) {
      return `${node.id}:svg-scale-requires-viewbox`;
    }
  }

  const bound = scalableBoundProperties((node as any).styleVariables ?? null);
  if (bound.length) return `${node.id}:bound-scale-property:${bound.join(',')}`;

  const channelProps = unsafeScaleChannelProperties(node as any);
  if (channelProps.length) return `${node.id}:conditional-or-variant-scale-channel:${channelProps.join(',')}`;

  if (!authored2DTransformIsSafe(node.styles?.transform)) return `${node.id}:unsupported-3d-or-expression-transform`;

  if (isRoot && transformHasDimensionalTranslation(node.styles?.transform)) {
    // Root placement and authored transform translation are two independent
    // translation channels. Until both can be composed algebraically across
    // every source representation, fail closed rather than double-moving.
    return `${node.id}:root-transform-translation`;
  }

  if (isRoot) {
    if (!authoredRootOffsetIsRepresentable(node.styles?.left)) return `${node.id}:root-left-not-safely-scalable`;
    if (!authoredRootOffsetIsRepresentable(node.styles?.top)) return `${node.id}:root-top-not-safely-scalable`;
    const conflictingInsets = ['right', 'bottom', 'inset', 'insetInline', 'insetBlock', 'insetInlineEnd', 'insetBlockEnd']
      .filter((key) => node.styles?.[key] != null && node.styles[key] !== 'auto');
    if (conflictingInsets.length) return `${node.id}:root-has-conflicting-insets:${conflictingInsets.join(',')}`;
  }

  if (isRoot && !node.isGroup) {
    if (!authoredSizeIsRepresentable(node.styles?.width)) return `${node.id}:root-width-not-safely-scalable`;
    if (!authoredSizeIsRepresentable(node.styles?.height)) return `${node.id}:root-height-not-safely-scalable`;
  }

  return null;
}

function collectOwnedSubtree(
  rootId: string,
  nodes: ReadonlyMap<string, CanvasNode>,
  out: string[],
  seen: Set<string>,
): string | null {
  if (seen.has(rootId)) return `${rootId}:cycle`;
  const node = nodes.get(rootId);
  if (!node) return `${rootId}:missing-node`;
  seen.add(rootId);
  out.push(rootId);
  if (isUniformSvgViewportLeaf(node, nodes)) return null;
  for (const childId of node.children ?? []) {
    const reason = collectOwnedSubtree(childId, nodes, out, seen);
    if (reason) return reason;
  }
  return null;
}

function makeSelectionBox(targets: ScaleTarget[]): ScaleBox | null {
  const boxes: ScaleBox[] = [];
  for (const target of targets) {
    const corners = getScreenCornersById(target.id, target.vpId);
    if (!corners) return null;
    boxes.push(cornersBox(corners));
  }
  return unionScreenBoxes(boxes);
}

export function measureScaleSelection(ids: readonly string[], vpId: string): ScaleSelectionMeasurement | null {
  const nodes = getNodesSnapshot();
  const roots = canonicalizeScaleRoots(ids, nodes);
  if (!roots.length) return null;
  const targets = roots.map((id) => ({ id, vpId }));
  const box = makeSelectionBox(targets);
  if (!box) return null;
  const cameraScale = transformManager.getTransform().scale || 1;
  return {
    box,
    width: box.width / cameraScale,
    height: box.height / cameraScale,
  };
}

function captureScaleSnapshot(
  targets: ScaleTarget[],
  anchor: ScaleAnchor | ScalePoint,
): ScaleSnapshot | ScaleBlockedResult {
  const factorScale = transformManager.getTransform().scale || 1;
  const vpId = getUniqueViewport(targets);
  if (vpId == null) return { ok: false, reason: 'multi-viewport-scale-is-not-authored-safely' };
  // Scale currently commits one coherent authored state. A replica viewport is
  // represented by responsive/container channels; rewriting only the live
  // branch would violate parity, so those cases fail closed until all channels
  // can be planned together.
  if (getViewportPrefix(vpId) !== '') return { ok: false, reason: 'responsive-replica-scale-not-yet-coherent' };

  const nodes = getNodesSnapshot();
  const byIdVp = new Map(targets.map((t) => [t.id, t.vpId]));
  const roots = canonicalizeScaleRoots(targets.map((t) => t.id), nodes);
  if (!roots.length) return { ok: false, reason: 'empty-or-unresolvable-selection' };
  const rootTargets = roots.map((id) => ({ id, vpId: byIdVp.get(id) ?? vpId }));
  const selectionBox = makeSelectionBox(rootTargets);
  if (!selectionBox) return { ok: false, reason: 'selection-geometry-unavailable' };
  const anchorScreen = typeof (anchor as ScalePoint).x === 'number'
    ? anchor as ScalePoint
    : anchorPoint(selectionBox, anchor as ScaleAnchor);

  const selected = new Set(roots);
  const rootGeometry = new Map<string, RootGeometry>();
  const allIds: string[] = [];
  const allSeen = new Set<string>();
  const groupIds = new Set<string>();

  for (const rootId of roots) {
    if (rootId === 'root' || rootId === 'layout::root') return { ok: false, reason: `${rootId}:viewport-root-not-scalable` };
    const root = nodes.get(rootId);
    if (!root) return { ok: false, reason: `${rootId}:missing-root` };
    if (hasUnsafeAncestorTransform(root, nodes, selected)) return { ok: false, reason: `${rootId}:transformed-unselected-ancestor` };

    const reason = validateNodeSemantics(root, true, nodes);
    if (reason) return { ok: false, reason };

    if (root.isGroup) {
      if (!validGroupBaseline(rootId, new Map(nodes))) return { ok: false, reason: `${rootId}:BLOCKED-GROUP-BASELINE` };
      if (root.styles?.transform && root.styles.transform !== 'none') return { ok: false, reason: `${rootId}:transformed-group-wrapper` };
    }

    const computed = findNodeComputedStyles(rootId, vpId, ['left', 'top', 'width', 'height', 'position', 'transform', 'transformOrigin']);
    const oldLeft = finitePx(computed.left);
    const oldTop = finitePx(computed.top);
    const oldWidth = finitePx(computed.width);
    const oldHeight = finitePx(computed.height);
    if ([oldLeft, oldTop, oldWidth, oldHeight].some((v) => v == null)) {
      return { ok: false, reason: `${rootId}:root-geometry-not-px-resolvable` };
    }

    const position = computed.position || root.styles?.position || '';
    if (!root.isCanvasNode && position !== 'absolute' && position !== 'fixed') {
      return { ok: false, reason: `${rootId}:root-placement-is-layout-controlled` };
    }

    const transform = computed.transform?.trim();
    if (transform && transform !== 'none') {
      // Computed transform-origin is normally resolved to px. Scale's root
      // placement formula assumes the 2D transform pivots around box center.
      const originParts = (computed.transformOrigin || '').split(/\s+/);
      const ox = Number.parseFloat(originParts[0]);
      const oy = Number.parseFloat(originParts[1]);
      if (!Number.isFinite(ox) || !Number.isFinite(oy)
        || Math.abs(ox - (oldWidth as number) / 2) > 0.75
        || Math.abs(oy - (oldHeight as number) / 2) > 0.75) {
        return { ok: false, reason: `${rootId}:non-center-root-transform-origin` };
      }
    }

    const corners = getScreenCornersById(rootId, vpId);
    if (!corners) return { ok: false, reason: `${rootId}:painted-corners-unavailable` };
    rootGeometry.set(rootId, {
      id: rootId,
      vpId,
      vpPrefix: getViewportPrefix(vpId),
      oldLeft: oldLeft as number,
      oldTop: oldTop as number,
      oldWidth: oldWidth as number,
      oldHeight: oldHeight as number,
      visualCenterScreen: cornersCenter(corners),
    });

    const subtreeIds: string[] = [];
    const subtreeSeen = new Set<string>();
    const collectReason = collectOwnedSubtree(rootId, nodes, subtreeIds, subtreeSeen);
    if (collectReason) return { ok: false, reason: collectReason };
    for (const id of subtreeIds) {
      if (allSeen.has(id)) continue;
      allSeen.add(id);
      allIds.push(id);
    }
  }

  const snapshots: ScaleNodeSnapshot[] = [];
  for (const id of allIds) {
    const node = nodes.get(id);
    if (!node) return { ok: false, reason: `${id}:missing-node` };
    const isRoot = selected.has(id);
    const reason = validateNodeSemantics(node, isRoot, nodes);
    if (reason) return { ok: false, reason };
    if (node.isGroup) groupIds.add(id);
    let groupWidth: number | undefined;
    let groupHeight: number | undefined;
    if (node.isGroup) {
      const computed = findNodeComputedStyles(id, vpId, ['width', 'height']);
      const measuredWidth = finitePx(computed.width);
      const measuredHeight = finitePx(computed.height);
      if (measuredWidth == null || measuredHeight == null) {
        return { ok: false, reason: `${id}:group-geometry-unavailable` };
      }
      groupWidth = measuredWidth;
      groupHeight = measuredHeight;
    }
    snapshots.push({
      id,
      vpId,
      vpPrefix: getViewportPrefix(vpId),
      styles: { ...(node.styles ?? {}) },
      isRoot,
      isGroup: !!node.isGroup,
      svgLeaf: captureSvgLeafSnapshot(node, nodes),
      groupWidth,
      groupHeight,
    });
  }

  return {
    roots,
    vpId,
    vpPrefix: getViewportPrefix(vpId),
    selectionBoxScreen: selectionBox,
    anchorScreen,
    cameraScale: factorScale,
    nodes: snapshots,
    rootGeometry,
    groupIds,
  };
}

function stripGroupDerivedDimensions(styles: Record<string, string>): void {
  for (const key of GROUP_DERIVED_DIMENSIONS) delete styles[key];
}

function rootPlacementStyles(root: RootGeometry, snapshot: ScaleSnapshot, factor: number): Record<string, string> {
  const desiredCenter = scalePoint(root.visualCenterScreen, snapshot.anchorScreen, factor);
  const dx = (desiredCenter.x - root.visualCenterScreen.x) / snapshot.cameraScale;
  const dy = (desiredCenter.y - root.visualCenterScreen.y) / snapshot.cameraScale;
  const newWidth = root.oldWidth * factor;
  const newHeight = root.oldHeight * factor;
  return {
    left: formatScalePx(root.oldLeft + dx - (newWidth - root.oldWidth) / 2),
    top: formatScalePx(root.oldTop + dy - (newHeight - root.oldHeight) / 2),
  };
}

function buildStylesForNode(node: ScaleNodeSnapshot, snapshot: ScaleSnapshot, factor: number): { commit: Record<string, string>; live: Record<string, string>; blocked: string[] } {
  const plan = planScaledStyles(node.styles, factor, { excludeRootOffsets: node.isRoot });
  const livePlan = planScaledStyles(node.styles, factor, { excludeRootOffsets: node.isRoot, includeUnchanged: true });
  const commit = { ...plan.styles };
  const live = { ...livePlan.styles };

  if (node.isGroup) {
    // Group dimensions are derived from painted children. Position belongs to
    // the coordinate-system cache and may move, but width/height/min/max are
    // never treated as authored Frame geometry by Scale.
    stripGroupDerivedDimensions(commit);
    stripGroupDerivedDimensions(live);
  }

  if (node.isRoot) {
    const root = snapshot.rootGeometry.get(node.id);
    if (root) {
      Object.assign(commit, rootPlacementStyles(root, snapshot, factor));
      Object.assign(live, rootPlacementStyles(root, snapshot, factor));
      if (node.isGroup) {
        // Live-only derived box lets the selection border/handles track the
        // gesture. Commit omits these; native Group refit derives them after
        // descendants land.
        live.width = formatScalePx(root.oldWidth * factor);
        live.height = formatScalePx(root.oldHeight * factor);
      }
    }
  } else if (node.isGroup) {
    // Nested Group's derived box comes from the immutable gesture snapshot.
    // Never re-read already-mutated live geometry here: every pointermove must
    // derive from the same start state or Scale compounds and drifts.
    if (node.groupWidth != null) live.width = formatScalePx(node.groupWidth * factor);
    if (node.groupHeight != null) live.height = formatScalePx(node.groupHeight * factor);
  }

  return { commit, live, blocked: Array.from(new Set([...plan.blocked, ...livePlan.blocked])) };
}


interface ScaleSvgLeafPlan {
  wrapperAttrs: Record<string, string>;
  children: Array<{ childIndex: number; attrs: Record<string, string> }>;
  blocked: string[];
}

function buildSvgLeafPlan(node: ScaleNodeSnapshot, factor: number): ScaleSvgLeafPlan | null {
  if (!node.svgLeaf) return null;
  const viewBox = scaleSvgViewBox(node.svgLeaf.viewBox, factor);
  if (!viewBox) {
    return { wrapperAttrs: {}, children: [], blocked: ['svg-viewbox-not-scalable'] };
  }

  const blocked: string[] = [];
  const children = node.svgLeaf.children.map((child) => {
    const planned = planScaledSvgShapeAttrs(child.tag, child.attrs, factor);
    blocked.push(...planned.blocked.map((reason) => `child-${child.childIndex}:${reason}`));
    return { childIndex: child.childIndex, attrs: planned.attrs };
  });

  return {
    wrapperAttrs: { viewBox },
    children,
    blocked,
  };
}

function applyGroupRefits(changedNodeIds: string[], contentEl: HTMLElement): void {
  const appliedSignature = new Set<string>();
  for (const id of changedNodeIds) {
    const plan = planNativeGroupRefitChain(id, getCachedNodesMap());
    if (!plan) continue;
    for (const patch of plan.patches) {
      const sig = `${patch.nodeId}:${JSON.stringify(patch.styles)}`;
      if (appliedSignature.has(sig)) continue;
      appliedSignature.add(sig);
      updateNodeStyles({
        id: patch.nodeId,
        styles: patch.styles,
        contentEl,
        viewportPrefix: '',
        skipGroupRefit: true,
      });
    }
  }
}

function applyScaleSnapshot(
  snapshot: ScaleSnapshot,
  factor: number,
  contentEl: HTMLElement,
  commit: boolean,
): ScaleResult {
  if (!Number.isFinite(factor) || factor < MIN_SCALE_FACTOR) {
    const reason = 'scale-factor-must-be-positive-and-nondegenerate';
    trace.action('scale:blocked', { reason, factor });
    return { ok: false, reason };
  }

  const plans = snapshot.nodes.map((node) => ({
    node,
    ...buildStylesForNode(node, snapshot, factor),
    svgLeaf: buildSvgLeafPlan(node, factor),
  }));
  const blocked = plans.flatMap((plan) => [
    ...plan.blocked.map((reason) => `${plan.node.id}:${reason}`),
    ...(plan.svgLeaf?.blocked ?? []).map((reason) => `${plan.node.id}:${reason}`),
  ]);
  if (blocked.length) {
    const reason = blocked.join(';');
    trace.action('scale:blocked', { reason, factor });
    return { ok: false, reason };
  }

  const changed: string[] = [];
  for (const plan of plans) {
    const styles = commit ? plan.commit : plan.live;
    if (!Object.keys(styles).length) continue;
    updateNodeStyles({
      id: plan.node.id,
      styles,
      contentEl,
      viewportPrefix: plan.node.vpPrefix,
      domOnly: !commit,
      skipGroupRefit: true,
    });
    changed.push(plan.node.id);
  }

  if (commit) {
    // A native SVG leaf previews correctly by scaling only its outer viewport.
    // Commit the SAME projection into source-space as one batch: enlarge the
    // viewBox and every authored inner metric together, preventing a visual
    // jump while making inspector/source values proportional too.
    for (const plan of plans) {
      if (!plan.svgLeaf) continue;
      queueMutation({ type: 'updateHtmlAttrs', nodeId: plan.node.id, attrs: plan.svgLeaf.wrapperAttrs });
      for (const child of plan.svgLeaf.children) {
        if (!Object.keys(child.attrs).length) continue;
        queueMutation({
          type: 'updateSvgAttrs',
          nodeId: plan.node.id,
          attrs: child.attrs,
          childIndex: child.childIndex,
        });
      }
      if (!changed.includes(plan.node.id)) changed.push(plan.node.id);
    }

    applyGroupRefits(changed, contentEl);
    // All authored Scale mutations — geometry, typography, effects and any
    // Group refits — are pending in the SAME mutation batch. One flush means
    // one visible undo/redo step.
    flushNow();
    requestAnimationFrame(() => forceCanvasRender());
    trace.action('scale:commit', { factor, roots: snapshot.roots, affected: changed.length });
  }

  return { ok: true, factor, affected: changed.length };
}

export function scaleSelectionByFactor(args: {
  ids: readonly string[];
  vpId: string;
  factor: number;
  anchor: ScaleAnchor;
  contentEl?: HTMLElement | null;
}): ScaleResult {
  if (!Number.isFinite(args.factor) || args.factor < MIN_SCALE_FACTOR) {
    return { ok: false, reason: 'scale-factor-must-be-positive-and-nondegenerate' };
  }
  if (Math.abs(args.factor - 1) < 1e-9) return { ok: true, factor: 1, affected: 0 };
  const contentEl = args.contentEl ?? getContentRoot();
  if (!contentEl) return { ok: false, reason: 'canvas-content-root-unavailable' };
  const targets = args.ids.map((id) => ({ id, vpId: args.vpId }));
  const snapshot = captureScaleSnapshot(targets, args.anchor);
  if ('ok' in snapshot) {
    trace.action('scale:blocked', { reason: snapshot.reason });
    return snapshot;
  }
  return applyScaleSnapshot(snapshot, args.factor, contentEl, true);
}

export function startScaleGesture(
  targets: ScaleTarget[],
  direction: ScaleCornerDirection,
  event: PointerEvent,
  options: { contentEl?: HTMLElement | null; onInteracting?: (active: boolean) => void } = {},
): ScaleResult {
  const contentEl = options.contentEl ?? getContentRoot();
  if (!contentEl) return { ok: false, reason: 'canvas-content-root-unavailable' };
  const selectionBox = makeSelectionBox(targets);
  if (!selectionBox) return { ok: false, reason: 'selection-geometry-unavailable' };

  const pointerAnchor = event.altKey
    ? anchorPoint(selectionBox, 'center')
    : anchorPoint(selectionBox, oppositeAnchorForCorner(direction));
  const snapshot = captureScaleSnapshot(targets, pointerAnchor);
  if ('ok' in snapshot) {
    trace.action('scale:blocked', { reason: snapshot.reason, direction });
    return snapshot;
  }

  const startPointer = { x: event.clientX, y: event.clientY };
  let liveFactor = 1;
  options.onInteracting?.(true);
  trace.action('scale:start', { roots: snapshot.roots, direction, altCenter: event.altKey });

  const onMove = (moveEvent: PointerEvent) => {
    const current = { x: moveEvent.clientX, y: moveEvent.clientY };
    liveFactor = scaleFactorFromPointer(snapshot.anchorScreen, startPointer, current);
    applyScaleSnapshot(snapshot, liveFactor, contentEl, false);
  };

  const cleanup = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    options.onInteracting?.(false);
  };

  const onUp = () => {
    cleanup();
    if (Math.abs(liveFactor - 1) < 1e-9) {
      // A click, or a drag that returns exactly to the start, is not an edit.
      // Rebuild once to clear any disposable preview residue without creating
      // source churn / a history entry / px-normalising placement for no reason.
      forceCanvasRender();
      trace.action('scale:no-op', { roots: snapshot.roots });
      return;
    }
    applyScaleSnapshot(snapshot, liveFactor, contentEl, true);
  };

  const onCancel = () => {
    cleanup();
    // Restore the immutable start projection, then rebuild from source as the
    // final authority. No mutation is queued and no history entry is created.
    applyScaleSnapshot(snapshot, 1, contentEl, false);
    forceCanvasRender();
    trace.action('scale:cancel', { roots: snapshot.roots });
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  return { ok: true, factor: 1, affected: snapshot.nodes.length };
}
