import type { CanvasNode } from '@/code/parsing/parser';
import { foldEffectiveTransform } from '@/shared/motion-transform';

export interface NativeGroupRefitPatch {
  nodeId: string;
  styles: Record<string, string>;
}

export interface NativeGroupRefitPlan {
  patches: NativeGroupRefitPatch[];
  groupIds: string[];
}

const GROUP_BOUNDS_KEYS = new Set([
  'left', 'top', 'right', 'bottom', 'width', 'height',
  'transform', 'transformOrigin', 'transformBox',
  'x', 'y', 'z', 'translateX', 'translateY', 'translateZ',
  'scale', 'scaleX', 'scaleY',
  'rotate', 'rotateX', 'rotateY', 'rotateZ',
  'skewX', 'skewY', 'transformPerspective',
]);

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

type Affine2D = [number, number, number, number, number, number];

interface VisualBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function effectiveNodeTransform(node: CanvasNode): string {
  return foldEffectiveTransform({
    styles: node.styles,
    motionVariants: node.motionVariants,
    conditionalStyles: node.conditionalStyles,
    variantKey: 'default',
  }).trim();
}

function hasEffectiveTransform(node: CanvasNode): boolean {
  const transform = effectiveNodeTransform(node);
  return !!transform && transform !== 'none';
}

const REBASE_TRANSFORM_STYLE_KEYS = [
  'x', 'y', 'z', 'translateX', 'translateY', 'translateZ',
  'scale', 'scaleX', 'scaleY',
  'rotate', 'rotateX', 'rotateY', 'rotateZ',
  'skewX', 'skewY', 'transformPerspective',
] as const;

const VARIANT_TRANSFORM_KEYS = new Set<string>([
  'transform', 'transformOrigin', 'transformBox',
  ...REBASE_TRANSFORM_STYLE_KEYS,
]);

function hasVariantOrConditionalTransformChannel(node: CanvasNode): boolean {
  for (const styles of Object.values(node.motionVariants ?? {})) {
    for (const key of Object.keys(styles ?? {})) {
      if (VARIANT_TRANSFORM_KEYS.has(key)) return true;
    }
  }
  for (const key of Object.keys(node.conditionalStyles ?? {})) {
    if (VARIANT_TRANSFORM_KEYS.has(key)) return true;
  }
  return false;
}

function mulAffine(a: Affine2D, b: Affine2D): Affine2D {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function parseFinite(raw: string): number | null {
  const n = Number.parseFloat(raw.trim());
  return Number.isFinite(n) ? n : null;
}

function parseAngle(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  const m = /^(-?(?:\d+|\d*\.\d+))(deg|rad|turn|grad)?$/.exec(value);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  const unit = m[2] ?? 'deg';
  if (!Number.isFinite(n)) return null;
  if (unit === 'rad') return n;
  if (unit === 'turn') return n * Math.PI * 2;
  if (unit === 'grad') return n * Math.PI / 200;
  return n * Math.PI / 180;
}

function parseLength(raw: string, percentBase: number): number | null {
  const value = raw.trim().toLowerCase();
  if (value === '0' || value === '+0' || value === '-0') return 0;
  const pxMatch = /^(-?(?:\d+|\d*\.\d+))px$/.exec(value);
  if (pxMatch) {
    const n = Number.parseFloat(pxMatch[1]);
    return Number.isFinite(n) ? n : null;
  }
  const pctMatch = /^(-?(?:\d+|\d*\.\d+))%$/.exec(value);
  if (pctMatch) {
    const n = Number.parseFloat(pctMatch[1]);
    return Number.isFinite(n) ? percentBase * n / 100 : null;
  }
  return null;
}

function splitArgs(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return (trimmed.includes(',')
    ? trimmed.split(',')
    : trimmed.split(/\s+/)
  ).map((s) => s.trim()).filter(Boolean);
}

function parseAffineTransform(
  transform: string,
  width: number,
  height: number,
): Affine2D | null {
  if (!transform || transform === 'none') return [1, 0, 0, 1, 0, 0];

  const fnRe = /([a-zA-Z0-9]+)\(([^()]*)\)/g;
  let cursor = 0;
  let composite: Affine2D = [1, 0, 0, 1, 0, 0];
  let match: RegExpExecArray | null;

  while ((match = fnRe.exec(transform)) !== null) {
    if (transform.slice(cursor, match.index).trim() !== '') return null;
    cursor = fnRe.lastIndex;

    const fn = match[1].toLowerCase();
    const args = splitArgs(match[2]);
    let next: Affine2D | null = null;

    if (fn === 'translate' || fn === 'translatex' || fn === 'translatey') {
      let tx = 0;
      let ty = 0;
      if (fn === 'translatex') {
        if (args.length !== 1) return null;
        const parsed = parseLength(args[0], width);
        if (parsed == null) return null;
        tx = parsed;
      } else if (fn === 'translatey') {
        if (args.length !== 1) return null;
        const parsed = parseLength(args[0], height);
        if (parsed == null) return null;
        ty = parsed;
      } else {
        if (args.length < 1 || args.length > 2) return null;
        const x = parseLength(args[0], width);
        const y = args[1] == null ? 0 : parseLength(args[1], height);
        if (x == null || y == null) return null;
        tx = x;
        ty = y;
      }
      next = [1, 0, 0, 1, tx, ty];
    } else if (fn === 'scale' || fn === 'scalex' || fn === 'scaley') {
      let sx = 1;
      let sy = 1;
      if (fn === 'scalex') {
        if (args.length !== 1) return null;
        const parsed = parseFinite(args[0]);
        if (parsed == null) return null;
        sx = parsed;
      } else if (fn === 'scaley') {
        if (args.length !== 1) return null;
        const parsed = parseFinite(args[0]);
        if (parsed == null) return null;
        sy = parsed;
      } else {
        if (args.length < 1 || args.length > 2) return null;
        const x = parseFinite(args[0]);
        const y = args[1] == null ? x : parseFinite(args[1]);
        if (x == null || y == null) return null;
        sx = x;
        sy = y;
      }
      next = [sx, 0, 0, sy, 0, 0];
    } else if (fn === 'rotate' || fn === 'rotatez') {
      if (args.length !== 1) return null;
      const angle = parseAngle(args[0]);
      if (angle == null) return null;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      next = [c, s, -s, c, 0, 0];
    } else if (fn === 'skewx' || fn === 'skewy' || fn === 'skew') {
      let ax = 0;
      let ay = 0;
      if (fn === 'skewx') {
        if (args.length !== 1) return null;
        const parsed = parseAngle(args[0]);
        if (parsed == null) return null;
        ax = parsed;
      } else if (fn === 'skewy') {
        if (args.length !== 1) return null;
        const parsed = parseAngle(args[0]);
        if (parsed == null) return null;
        ay = parsed;
      } else {
        if (args.length < 1 || args.length > 2) return null;
        const x = parseAngle(args[0]);
        const y = args[1] == null ? 0 : parseAngle(args[1]);
        if (x == null || y == null) return null;
        ax = x;
        ay = y;
      }
      next = [1, Math.tan(ay), Math.tan(ax), 1, 0, 0];
    } else if (fn === 'matrix') {
      if (args.length !== 6) return null;
      const nums = args.map(parseFinite);
      if (nums.some((n) => n == null)) return null;
      next = nums as Affine2D;
    } else {
      // perspective / rotateX / rotateY / matrix3d / translateZ / scale3d …
      // require a 3D projection model. Keep them gated rather than flattening.
      return null;
    }

    composite = mulAffine(composite, next);
  }

  if (transform.slice(cursor).trim() !== '') return null;
  return composite;
}

function parseOriginToken(raw: string, size: number, axis: 'x' | 'y'): number | null {
  const v = raw.trim().toLowerCase();
  if (v === 'center') return size / 2;
  if (axis === 'x' && v === 'left') return 0;
  if (axis === 'x' && v === 'right') return size;
  if (axis === 'y' && v === 'top') return 0;
  if (axis === 'y' && v === 'bottom') return size;
  return parseLength(v, size);
}

function parseTransformOrigin(
  raw: string | undefined,
  width: number,
  height: number,
): { x: number; y: number } | null {
  if (!raw || raw.trim() === '') return { x: width / 2, y: height / 2 };
  const parts = raw.trim().split(/\s+/);
  if (parts.length > 2) return null;

  let xRaw = parts[0];
  let yRaw = parts[1] ?? 'center';

  // CSS permits vertical keyword first: "top left".
  if ((xRaw === 'top' || xRaw === 'bottom') && (yRaw === 'left' || yRaw === 'right' || yRaw === 'center')) {
    [xRaw, yRaw] = [yRaw, xRaw];
  }

  const x = parseOriginToken(xRaw, width, 'x');
  const y = parseOriginToken(yRaw, height, 'y');
  return x == null || y == null ? null : { x, y };
}

function applyAffine(m: Affine2D, x: number, y: number): { x: number; y: number } {
  return {
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5],
  };
}

/**
 * Rebase an absolute transformed Group after its child-derived local bounds
 * change. The wrapper's authored 2D affine transform stays untouched while
 * left/top compensate for the child-space rebase, transform-origin movement,
 * and percentage transform translations that resolve against width/height.
 *
 * Old mapping:
 *   world(p) = L + O_old + M_old * (p - O_old)
 * Child rebase:
 *   p' = p - delta
 * Required wrapper position:
 *   L' = L + A*delta + (I-A)*(O_old-O_new) + (t_old-t_new)
 */
function resolveTransformedGroupRebasePosition(
  group: CanvasNode,
  left: number,
  top: number,
  deltaX: number,
  deltaY: number,
  nextWidth: number,
  nextHeight: number,
): { left: number; top: number } | null {
  const oldWidth = px(group.styles?.width);
  const oldHeight = px(group.styles?.height);
  if (oldWidth == null || oldHeight == null || oldWidth < 0 || oldHeight < 0) return null;
  if (nextWidth < 0 || nextHeight < 0) return null;

  const transformBox = group.styles?.transformBox?.trim();
  if (transformBox && transformBox !== 'border-box') return null;

  const transform = effectiveNodeTransform(group);
  if (!transform || transform === 'none') {
    return { left: left + deltaX, top: top + deltaY };
  }

  const oldAffine = parseAffineTransform(transform, oldWidth, oldHeight);
  const nextAffine = parseAffineTransform(transform, nextWidth, nextHeight);
  const oldOrigin = parseTransformOrigin(group.styles?.transformOrigin, oldWidth, oldHeight);
  const nextOrigin = parseTransformOrigin(group.styles?.transformOrigin, nextWidth, nextHeight);
  if (!oldAffine || !nextAffine || !oldOrigin || !nextOrigin) return null;

  // Resizing only changes percentage-backed translation and transform origin.
  // The affine linear part must remain identical; otherwise preserving the
  // painted artifact would require rewriting the authored transform itself.
  const EPSILON = 1e-9;
  for (let i = 0; i < 4; i += 1) {
    if (Math.abs(oldAffine[i] - nextAffine[i]) > EPSILON) return null;
  }

  const [a, b, c, d, oldTx, oldTy] = oldAffine;
  const nextTx = nextAffine[4];
  const nextTy = nextAffine[5];
  const originDx = oldOrigin.x - nextOrigin.x;
  const originDy = oldOrigin.y - nextOrigin.y;

  const nextLeft = left
    + a * deltaX + c * deltaY
    + (1 - a) * originDx - c * originDy
    + (oldTx - nextTx);
  const nextTop = top
    + b * deltaX + d * deltaY
    - b * originDx + (1 - d) * originDy
    + (oldTy - nextTy);

  if (!Number.isFinite(nextLeft) || !Number.isFinite(nextTop)) return null;
  return { left: nextLeft, top: nextTop };
}

/**
 * Resolve one direct child's AXIS-ALIGNED visual bounds in Group-local space.
 *
 * This supports the 2D affine transform family field itself authors/imports:
 * translate, scale, rotate, skew and matrix(), including motion shorthand
 * channels folded through the same static-canvas transform helper. Transform
 * origin is honored. Perspective/3D and non-border transform boxes stay gated.
 */
function resolveNativeGroupChildVisualBounds(child: CanvasNode): VisualBounds | null {
  const left = px(child.styles?.left, 0);
  const top = px(child.styles?.top, 0);
  const width = px(child.styles?.width);
  const height = px(child.styles?.height);
  if (left == null || top == null || width == null || height == null) return null;
  if (width < 0 || height < 0) return null;

  const transformBox = child.styles?.transformBox?.trim();
  if (transformBox && transformBox !== 'border-box') return null;

  const transform = effectiveNodeTransform(child);
  if (!transform || transform === 'none') return { left, top, width, height };

  const affine = parseAffineTransform(transform, width, height);
  const origin = parseTransformOrigin(child.styles?.transformOrigin, width, height);
  if (!affine || !origin) return null;

  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ] as const;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of corners) {
    const local = applyAffine(affine, x - origin.x, y - origin.y);
    const tx = left + origin.x + local.x;
    const ty = top + origin.y + local.y;
    minX = Math.min(minX, tx);
    minY = Math.min(minY, ty);
    maxX = Math.max(maxX, tx);
    maxY = Math.max(maxY, ty);
  }

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
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
  if (!node.isGroup) return false;
  const mode = nativeGroupPositionMode(node);
  if (!mode) return false;

  const transform = effectiveNodeTransform(node);
  if (!transform || transform === 'none') return true;

  // Parent layout owns a flow Group's origin; B9 intentionally kept this
  // transformed-wrapper case gated. B10 only opens ABSOLUTE Groups whose
  // transform is exactly representable by the same 2D affine model as refit.
  if (mode !== 'absolute') return false;
  const width = px(node.styles?.width);
  const height = px(node.styles?.height);
  if (width == null || height == null || width < 0 || height < 0) return false;
  const transformBox = node.styles?.transformBox?.trim();
  if (transformBox && transformBox !== 'border-box') return false;
  return parseAffineTransform(transform, width, height) !== null
    && parseTransformOrigin(node.styles?.transformOrigin, width, height) !== null;
}
/**
 * Compute one shrink-wrap step for a native field Group.
 *
 * Native Group refit is exact for canonical pixel-backed child geometry and the
 * supported 2D affine transform family. Absolute transformed Group wrappers
 * compensate their own origin/translation changes so descendant world-space
 * appearance is preserved. Transformed flow Group wrappers remain gated until
 * parent-layout-aware compensation is modeled explicitly.
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
  if (!groupMode) return null;

  const groupTransform = effectiveNodeTransform(group);
  const groupHasTransform = !!groupTransform && groupTransform !== 'none';
  // Parent Auto Layout owns a flow Group's origin. A transformed flow wrapper
  // needs a parent-layout-aware compensation model and remains gated in B9.
  if (groupMode === 'flow' && groupHasTransform) return null;

  const groupLeft = groupMode === 'absolute' ? px(group.styles?.left, 0) : 0;
  const groupTop = groupMode === 'absolute' ? px(group.styles?.top, 0) : 0;
  if (groupLeft == null || groupTop == null) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const children: Array<{ node: CanvasNode; left: number; top: number }> = [];

  for (const childId of group.children) {
    const child = nodes.get(childId);
    if (!child) return null;
    if ((child.styles?.position ?? '') !== 'absolute') return null;

    const sourceLeft = px(child.styles?.left, 0);
    const sourceTop = px(child.styles?.top, 0);
    const bounds = resolveNativeGroupChildVisualBounds(child);
    if (sourceLeft == null || sourceTop == null || !bounds) return null;

    children.push({ node: child, left: sourceLeft, top: sourceTop });
    minX = Math.min(minX, bounds.left);
    minY = Math.min(minY, bounds.top);
    maxX = Math.max(maxX, bounds.left + bounds.width);
    maxY = Math.max(maxY, bounds.top + bounds.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)
      || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;

  const patches = new Map<string, Record<string, string>>();
  // A flow Group's origin belongs to its parent layout. Shrink-wrapping may
  // change width/height, but it must NEVER rebase children away from that
  // origin: doing so visually moves the collection inside its Auto Layout slot.
  // Only a child union already rooted at local 0,0 can refit exactly.
  if (groupMode === 'flow' && (minX !== 0 || minY !== 0)) return null;

  const nextWidth = maxX - minX;
  const nextHeight = maxY - minY;
  let nextPosition: { left: number; top: number } | null = null;
  if (groupMode === 'absolute') {
    nextPosition = groupHasTransform
      ? resolveTransformedGroupRebasePosition(
        group,
        groupLeft,
        groupTop,
        minX,
        minY,
        nextWidth,
        nextHeight,
      )
      : { left: groupLeft + minX, top: groupTop + minY };
    if (!nextPosition) return null;
  }

  const groupStyles: Record<string, string> = {
    ...(nextPosition ? {
      left: fmtPx(nextPosition.left),
      top: fmtPx(nextPosition.top),
    } : {}),
    width: fmtPx(nextWidth),
    height: fmtPx(nextHeight),
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
  return Object.keys(styles).some((key) => GROUP_BOUNDS_KEYS.has(key));
}

export interface NativeGroupResizeAffine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface NativeGroupResizeCorners {
  TL: { x: number; y: number };
  TR: { x: number; y: number };
  BR: { x: number; y: number };
  BL: { x: number; y: number };
}

export interface NativeGroupResizeBox {
  left: number;
  top: number;
  width: number;
  height: number;
  /** The node carries a supported visual 2D affine transform. */
  transformed?: boolean;
  /** Effective transform rewritten around local border-box origin (0,0).
   *  parentPoint = [left, top] + affine(localPoint). */
  affine?: NativeGroupResizeAffine;
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

export function nativeGroupResizeHasCompleteAffineGeometry(
  snapshot: NativeGroupResizeSnapshot,
): boolean {
  for (const box of snapshot.values()) {
    if (!box.transformed) continue;
    const affine = box.affine;
    if (!affine) return false;
    const values = [affine.a, affine.b, affine.c, affine.d, affine.e, affine.f];
    if (!values.every(Number.isFinite)) return false;
    if (Math.abs(affine.a * affine.d - affine.c * affine.b) < 1e-10) return false;
  }
  return true;
}

/**
 * Source-side guard for a transformed descendant that ordinary Group Resize
 * may canonicalize to a 2D matrix. Variant/conditional transform channels are
 * intentionally refused: one viewport resize must not bake another viewport's
 * transform into shared base styles. Perspective/3D and non-border transform
 * boxes remain outside the ordinary Group Resize model.
 */
export function nativeGroupResizeNodeSupportsAffine(
  node: CanvasNode,
  width: number,
  height: number,
): boolean {
  if (!(width > 0) || !(height > 0)) return false;
  if (hasVariantOrConditionalTransformChannel(node)) return false;
  const transformBox = node.styles?.transformBox?.trim();
  if (transformBox && transformBox !== 'border-box') return false;
  const transform = effectiveNodeTransform(node);
  if (!transform || transform === 'none') return false;
  return parseAffineTransform(transform, width, height) !== null
    && parseTransformOrigin(node.styles?.transformOrigin, width, height) !== null;
}

function finiteResizeCorners(corners: NativeGroupResizeCorners): boolean {
  return [corners.TL, corners.TR, corners.BR, corners.BL]
    .every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function resizeCornersAreParallelogram(corners: NativeGroupResizeCorners): boolean {
  if (!finiteResizeCorners(corners)) return false;
  const expectedX = corners.TR.x + corners.BL.x - corners.TL.x;
  const expectedY = corners.TR.y + corners.BL.y - corners.TL.y;
  const span = Math.max(
    1,
    Math.abs(corners.TR.x - corners.TL.x),
    Math.abs(corners.TR.y - corners.TL.y),
    Math.abs(corners.BL.x - corners.TL.x),
    Math.abs(corners.BL.y - corners.TL.y),
  );
  const tolerance = Math.max(0.05, span * 1e-5);
  return Math.abs(corners.BR.x - expectedX) <= tolerance
    && Math.abs(corners.BR.y - expectedY) <= tolerance;
}

/**
 * Recover one child's complete painted 2D affine in its immediate Group's
 * LOCAL coordinate system. Both quads are sampled from the same canvas cache,
 * so camera pan/zoom cancels when the parent basis is inverted.
 */
export function resolveNativeGroupResizeAffineFromCorners(args: {
  childWorldCorners: NativeGroupResizeCorners;
  parentWorldCorners: NativeGroupResizeCorners;
  parentLocalWidth: number;
  parentLocalHeight: number;
  childBox: Pick<NativeGroupResizeBox, 'left' | 'top' | 'width' | 'height'>;
}): NativeGroupResizeAffine | null {
  const { childWorldCorners, parentWorldCorners, parentLocalWidth, parentLocalHeight, childBox } = args;
  if (!resizeCornersAreParallelogram(childWorldCorners)
      || !resizeCornersAreParallelogram(parentWorldCorners)) return null;
  if (!(parentLocalWidth > 0) || !(parentLocalHeight > 0)
      || !(childBox.width > 0) || !(childBox.height > 0)) return null;

  const ux = (parentWorldCorners.TR.x - parentWorldCorners.TL.x) / parentLocalWidth;
  const uy = (parentWorldCorners.TR.y - parentWorldCorners.TL.y) / parentLocalWidth;
  const vx = (parentWorldCorners.BL.x - parentWorldCorners.TL.x) / parentLocalHeight;
  const vy = (parentWorldCorners.BL.y - parentWorldCorners.TL.y) / parentLocalHeight;
  const determinant = ux * vy - vx * uy;
  if (![ux, uy, vx, vy, determinant].every(Number.isFinite) || Math.abs(determinant) < 1e-10) return null;

  const toLocal = (point: { x: number; y: number }) => {
    const dx = point.x - parentWorldCorners.TL.x;
    const dy = point.y - parentWorldCorners.TL.y;
    return {
      x: (dx * vy - vx * dy) / determinant,
      y: (ux * dy - dx * uy) / determinant,
    };
  };

  const local: NativeGroupResizeCorners = {
    TL: toLocal(childWorldCorners.TL),
    TR: toLocal(childWorldCorners.TR),
    BR: toLocal(childWorldCorners.BR),
    BL: toLocal(childWorldCorners.BL),
  };
  if (!resizeCornersAreParallelogram(local)) return null;

  const affine: NativeGroupResizeAffine = {
    a: (local.TR.x - local.TL.x) / childBox.width,
    b: (local.TR.y - local.TL.y) / childBox.width,
    c: (local.BL.x - local.TL.x) / childBox.height,
    d: (local.BL.y - local.TL.y) / childBox.height,
    e: local.TL.x - childBox.left,
    f: local.TL.y - childBox.top,
  };
  const values = [affine.a, affine.b, affine.c, affine.d, affine.e, affine.f];
  if (!values.every(Number.isFinite)) return null;
  if (Math.abs(affine.a * affine.d - affine.c * affine.b) < 1e-10) return null;
  return affine;
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

  // Uniform Group resize keeps the B6 behavior: box geometry scales and the
  // authored transform stays intact. For a NON-uniform resize, a rotated or
  // skewed descendant needs an affine conjugation S * A * S^-1; otherwise its
  // painted geometry drifts because non-uniform scale and rotation do not
  // commute. This is still ordinary Resize: typography, strokes and effects
  // remain untouched. Dedicated Scale may later scale those visual properties.
  const nonUniform = Math.abs(sx - sy) > 1e-6;
  if (nonUniform && nativeGroupResizeHasTransformedGeometry(snapshot)
      && !nativeGroupResizeHasCompleteAffineGeometry(snapshot)) return null;

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
      const styles: Record<string, string> = {
        left: fmtPx(box.left * sx),
        top: fmtPx(box.top * sy),
        width: fmtPx(box.width * sx),
        height: fmtPx(box.height * sy),
      };

      if (nonUniform && box.transformed) {
        const affine = box.affine;
        if (!affine || !nativeGroupResizeNodeSupportsAffine(child, box.width, box.height)) return false;

        // CSS matrix(a,b,c,d,e,f) maps local point p to A*p+t. The Group
        // resize maps parent coordinates through S=diag(sx,sy), while the
        // child's own box coordinates are ALSO resized by S. Therefore the
        // exact post-resize child affine is S*A*S^-1 with translation S*t.
        const nextAffine: NativeGroupResizeAffine = {
          a: affine.a,
          b: affine.b * sy / sx,
          c: affine.c * sx / sy,
          d: affine.d,
          e: affine.e * sx,
          f: affine.f * sy,
        };
        const determinant = nextAffine.a * nextAffine.d - nextAffine.c * nextAffine.b;
        if (![nextAffine.a, nextAffine.b, nextAffine.c, nextAffine.d, nextAffine.e, nextAffine.f]
          .every(Number.isFinite) || Math.abs(determinant) < 1e-10) return false;

        styles.transform = 'matrix(' + [
          nextAffine.a, nextAffine.b, nextAffine.c,
          nextAffine.d, nextAffine.e, nextAffine.f,
        ].map(fmtAffineScalar).join(', ') + ')';
        styles.transformOrigin = '0px 0px';
        styles.transformBox = 'border-box';
        for (const key of REBASE_TRANSFORM_STYLE_KEYS) {
          if (child.styles?.[key] != null && child.styles[key] !== '') styles[key] = '';
        }
      }

      mergePatch(patches, childId, styles);

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

export interface NativeGroupWorldPoint {
  x: number;
  y: number;
}

export interface NativeGroupWorldCorners {
  TL: NativeGroupWorldPoint;
  TR: NativeGroupWorldPoint;
  BR: NativeGroupWorldPoint;
  BL: NativeGroupWorldPoint;
}

export interface NativeGroupLocalSize {
  width: number;
  height: number;
}

function fmtAffineScalar(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return String(normalized);
}

function finiteWorldCorners(corners: NativeGroupWorldCorners): boolean {
  return [corners.TL, corners.TR, corners.BR, corners.BL]
    .every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function affineQuadIsParallelogram(corners: NativeGroupWorldCorners): boolean {
  if (!finiteWorldCorners(corners)) return false;
  const expectedX = corners.TR.x + corners.BL.x - corners.TL.x;
  const expectedY = corners.TR.y + corners.BL.y - corners.TL.y;
  const span = Math.max(
    1,
    Math.abs(corners.TR.x - corners.TL.x),
    Math.abs(corners.TR.y - corners.TL.y),
    Math.abs(corners.BL.x - corners.TL.x),
    Math.abs(corners.BL.y - corners.TL.y),
  );
  const tolerance = Math.max(0.05, span * 1e-5);
  return Math.abs(corners.BR.x - expectedX) <= tolerance
    && Math.abs(corners.BR.y - expectedY) <= tolerance;
}

function resolveLayersWorldToLocalMoveStyles(args: {
  dragged: CanvasNode;
  draggedWorldCorners: NativeGroupWorldCorners;
  newParentWorldCorners: NativeGroupWorldCorners;
  newParentLocalSize: NativeGroupLocalSize;
}): Record<string, string> | null {
  const { dragged, draggedWorldCorners, newParentWorldCorners, newParentLocalSize } = args;
  if (!affineQuadIsParallelogram(draggedWorldCorners)
      || !affineQuadIsParallelogram(newParentWorldCorners)) return null;

  const childWidth = px(dragged.styles?.width);
  const childHeight = px(dragged.styles?.height);
  const parentWidth = newParentLocalSize.width;
  const parentHeight = newParentLocalSize.height;
  if (childWidth == null || childHeight == null || childWidth <= 0 || childHeight <= 0) return null;
  if (![parentWidth, parentHeight].every(Number.isFinite) || parentWidth <= 0 || parentHeight <= 0) return null;

  // The parent's painted border-box corners define an exact screen-space
  // affine basis. Divide its top/left edge vectors by the untransformed local
  // border-box dimensions, then invert that 2x2 basis. Camera pan/zoom cancels
  // automatically because BOTH quads were captured in the same screen space.
  const ux = (newParentWorldCorners.TR.x - newParentWorldCorners.TL.x) / parentWidth;
  const uy = (newParentWorldCorners.TR.y - newParentWorldCorners.TL.y) / parentWidth;
  const vx = (newParentWorldCorners.BL.x - newParentWorldCorners.TL.x) / parentHeight;
  const vy = (newParentWorldCorners.BL.y - newParentWorldCorners.TL.y) / parentHeight;
  const determinant = ux * vy - vx * uy;
  if (![ux, uy, vx, vy, determinant].every(Number.isFinite) || Math.abs(determinant) < 1e-10) return null;

  const toLocal = (point: NativeGroupWorldPoint): NativeGroupWorldPoint => {
    const dx = point.x - newParentWorldCorners.TL.x;
    const dy = point.y - newParentWorldCorners.TL.y;
    return {
      x: (dx * vy - vx * dy) / determinant,
      y: (ux * dy - dx * uy) / determinant,
    };
  };

  const localCorners: NativeGroupWorldCorners = {
    TL: toLocal(draggedWorldCorners.TL),
    TR: toLocal(draggedWorldCorners.TR),
    BR: toLocal(draggedWorldCorners.BR),
    BL: toLocal(draggedWorldCorners.BL),
  };
  if (!affineQuadIsParallelogram(localCorners)) return null;

  const a = (localCorners.TR.x - localCorners.TL.x) / childWidth;
  const b = (localCorners.TR.y - localCorners.TL.y) / childWidth;
  const c = (localCorners.BL.x - localCorners.TL.x) / childHeight;
  const d = (localCorners.BL.y - localCorners.TL.y) / childHeight;
  const childDeterminant = a * d - c * b;
  if (![a, b, c, d, childDeterminant].every(Number.isFinite) || Math.abs(childDeterminant) < 1e-10) return null;

  const moveStyles: Record<string, string> = {
    position: 'absolute',
    left: fmtPx(localCorners.TL.x),
    top: fmtPx(localCorners.TL.y),
    right: '',
    bottom: '',
  };

  const identity = Math.abs(a - 1) < 1e-6
    && Math.abs(b) < 1e-6
    && Math.abs(c) < 1e-6
    && Math.abs(d - 1) < 1e-6;
  const draggedHasTransform = hasEffectiveTransform(dragged);
  if (!identity || draggedHasTransform) {
    // Responsive/variant transform channels cannot be rewritten from ONE
    // Layers viewport without changing another viewport's semantics. Refuse
    // rather than bake one tile's geometry into the shared base style.
    if (hasVariantOrConditionalTransformChannel(dragged)) return null;

    const transformBox = dragged.styles?.transformBox?.trim();
    if (transformBox && transformBox !== 'border-box') return null;
    const effective = effectiveNodeTransform(dragged);
    if (effective && effective !== 'none' && parseAffineTransform(effective, childWidth, childHeight) == null) return null;

    moveStyles.transform = identity
      ? 'none'
      : 'matrix(' + [a, b, c, d].map(fmtAffineScalar).join(', ') + ', 0, 0)';
    moveStyles.transformOrigin = '0px 0px';
    moveStyles.transformBox = 'border-box';
    for (const key of REBASE_TRANSFORM_STYLE_KEYS) {
      if (dragged.styles?.[key] != null && dragged.styles[key] !== '') moveStyles[key] = '';
    }
  }

  return moveStyles;
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
    draggedWorldCorners?: NativeGroupWorldCorners | null;
    newParentWorldCorners?: NativeGroupWorldCorners | null;
    newParentLocalSize?: NativeGroupLocalSize | null;
    preserveDraggedGeometry: boolean;
  },
): NativeGroupLayersReparentPlan | null {
  const {
    draggedId, newParentId, nodes, draggedWorld, newParentWorld,
    draggedWorldCorners, newParentWorldCorners, newParentLocalSize, preserveDraggedGeometry,
  } = args;
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
    const sourceOrDraggedTransformed = (!!source && sourceIsGroup && hasEffectiveTransform(source))
      || hasEffectiveTransform(dragged);
    const destinationTransformed = hasEffectiveTransform(destination);
    const requiresAffineConversion = sourceOrDraggedTransformed || destinationTransformed;

    const fallbackParentWidth = destinationIsGroup ? px(destination.styles?.width) : null;
    const fallbackParentHeight = destinationIsGroup ? px(destination.styles?.height) : null;
    const localSize = newParentLocalSize
      ?? (fallbackParentWidth != null && fallbackParentHeight != null
        ? { width: fallbackParentWidth, height: fallbackParentHeight }
        : null);

    const affineMoveStyles = draggedWorldCorners && newParentWorldCorners && localSize
      ? resolveLayersWorldToLocalMoveStyles({
        dragged,
        draggedWorldCorners,
        newParentWorldCorners,
        newParentLocalSize: localSize,
      })
      : null;

    if (affineMoveStyles) {
      Object.assign(moveStyles, affineMoveStyles);
    } else if (requiresAffineConversion) {
      // An AABB subtraction destroys orientation under transformed parents. If
      // exact painted corners/local dimensions are cold or unsupported, fail
      // the entire Layers gesture instead of changing hierarchy with drift.
      return null;
    } else {
      // Legacy exact fast path for ordinary axis-aligned Groups. Keeping this
      // independent of the corners cache avoids regressing cold-cache drops.
      moveStyles.position = 'absolute';
      moveStyles.left = fmtPx(draggedWorld.left - newParentWorld.left);
      moveStyles.top = fmtPx(draggedWorld.top - newParentWorld.top);
      moveStyles.right = '';
      moveStyles.bottom = '';
    }
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
