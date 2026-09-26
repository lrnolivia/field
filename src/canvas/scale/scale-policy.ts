// scale-policy.ts — explicit source-value policy for dedicated Scale.
// This module is deliberately pure/testable. It never multiplies arbitrary
// strings and never mutates shared variables/tokens.

import { formatScaleNumber, formatScalePx } from './scale-math';
import { scaleShapeGeometry } from '@/shared/svg-geometry';

export type ScaleValueClass =
  | 'zero'
  | 'px'
  | 'number'
  | 'percentage'
  | 'relative'
  | 'variable'
  | 'calc'
  | 'keyword'
  | 'compound';

export interface ScalePolicyResult {
  styles: Record<string, string>;
  blocked: string[];
  preserved: string[];
}

export interface ScaleSvgAttrPolicyResult {
  attrs: Record<string, string>;
  blocked: string[];
  preserved: string[];
}

const DIMENSIONAL_PROPS = new Set([
  // box geometry / offsets
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'inlineSize', 'blockSize', 'minInlineSize', 'minBlockSize', 'maxInlineSize', 'maxBlockSize', 'flexBasis',
  'left', 'top', 'right', 'bottom', 'inset', 'insetInline', 'insetBlock',
  'insetInlineStart', 'insetInlineEnd', 'insetBlockStart', 'insetBlockEnd',
  // spacing / native layout
  'gap', 'rowGap', 'columnGap', 'gridGap', 'gridRowGap', 'gridColumnGap',
  'gridTemplateColumns', 'gridTemplateRows', 'gridAutoColumns', 'gridAutoRows',
  'borderSpacing', 'columnWidth',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'paddingInline', 'paddingInlineStart', 'paddingInlineEnd',
  'paddingBlock', 'paddingBlockStart', 'paddingBlockEnd',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'marginInline', 'marginInlineStart', 'marginInlineEnd',
  'marginBlock', 'marginBlockStart', 'marginBlockEnd',
  // typography
  'fontSize', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent',
  // borders / strokes / corners
  'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'outlineWidth', 'outlineOffset', 'columnRuleWidth',
  'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomRightRadius', 'borderBottomLeftRadius',
  'strokeWidth', 'strokeDashoffset',
  // transforms with dimensional channels
  'translate', 'translateX', 'translateY', 'transformOrigin',
  // media positioning that can be authored dimensionally
  'backgroundPositionX', 'backgroundPositionY', 'backgroundSize',
]);

const COMPOUND_BORDER_PROPS = new Set([
  'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
  'outline', 'columnRule',
]);

const SHADOW_PROPS = new Set(['boxShadow', 'textShadow']);
const FILTER_PROPS = new Set(['filter', 'backdropFilter', 'WebkitBackdropFilter']);

export function isScaleDimensionalProperty(prop: string): boolean {
  return DIMENSIONAL_PROPS.has(prop)
    || COMPOUND_BORDER_PROPS.has(prop)
    || SHADOW_PROPS.has(prop)
    || FILTER_PROPS.has(prop)
    || prop === 'strokeDasharray'
    || prop === 'transform';
}

export function classifyScaleValue(raw: string): ScaleValueClass {
  const value = raw.trim();
  if (/^[+-]?0(?:\.0+)?(?:px)?$/i.test(value)) return 'zero';
  if (/^[+-]?(?:\d+|\d*\.\d+)px$/i.test(value)) return 'px';
  if (/^[+-]?(?:\d+|\d*\.\d+)$/.test(value)) return 'number';
  if (/^[+-]?(?:\d+|\d*\.\d+)%$/.test(value)) return 'percentage';
  if (/var\(/i.test(value) || /^var:/i.test(value)) return 'variable';
  if (/calc\(|min\(|max\(|clamp\(/i.test(value)) return 'calc';
  if (/^[+-]?(?:\d+|\d*\.\d+)(?:em|rem|vw|vh|vmin|vmax|cqw|cqh|ch|ex|lh|rlh)$/i.test(value)) return 'relative';
  if (/^[a-z-]+$/i.test(value)) return 'keyword';
  return 'compound';
}

function scalePxToken(raw: string, factor: number): string | null {
  const cls = classifyScaleValue(raw);
  if (cls === 'zero') return '0px';
  if (cls !== 'px') return null;
  return formatScalePx(Number.parseFloat(raw) * factor);
}

function scaleAbsoluteTokens(value: string, factor: number, allowUnitless = false): { value: string; changed: boolean; blocked: boolean } {
  let changed = false;
  let blocked = false;
  const out = value.replace(/([+-]?(?:\d+|\d*\.\d+))(px|%|em|rem|vw|vh|vmin|vmax|cqw|cqh|ch|ex|lh|rlh)?/gi, (full, nRaw: string, unitRaw: string | undefined, offset: number, whole: string) => {
    // Avoid digits embedded in identifiers / hex colours / custom-property names.
    const before = offset > 0 ? whole[offset - 1] : '';
    const after = whole[offset + full.length] ?? '';
    if (/[\w#.-]/.test(before) || /[\w-]/.test(after)) return full;
    const n = Number.parseFloat(nRaw);
    if (!Number.isFinite(n)) return full;
    const unit = (unitRaw ?? '').toLowerCase();
    if (unit === 'px' || (allowUnitless && unit === '')) {
      changed = true;
      return unit === 'px' ? formatScalePx(n * factor) : formatScaleNumber(n * factor);
    }
    if (unit === '' && n === 0) return full;
    if (unit && unit !== '%' && unit !== 'px') blocked = true;
    return full;
  });
  return { value: out, changed, blocked };
}

function scaleSimpleDimensional(prop: string, value: string, factor: number): { value: string; blocked?: string; preserved?: string } {
  const cls = classifyScaleValue(value);
  if (cls === 'zero') return { value: '0px' };
  if (cls === 'px') return { value: formatScalePx(Number.parseFloat(value) * factor) };

  // SVG stroke metrics commonly arrive as unitless numbers; these are
  // dimensional user-space values, unlike unitless line-height ratios.
  if ((prop === 'strokeWidth' || prop === 'strokeDashoffset') && cls === 'number') {
    return { value: formatScaleNumber(Number.parseFloat(value) * factor) };
  }

  // Relative typography stays semantic. In particular, descendant `em`/`lh`
  // values already inherit the scaled parent metric; multiplying them again
  // would double-scale the text. The operation deliberately preserves these
  // relationships instead of flattening them to computed px.
  // Unitless line-height is a ratio. It already grows with fontSize.
  if (prop === 'lineHeight' && cls === 'number') return { value, preserved: `${prop}:unitless-ratio` };

  // Percentages / relative units preserve semantic relationships rather than
  // being flattened to pixels. Relative-unit values are safe to preserve,
  // but they may make exact screenshot parity context-dependent.
  if (cls === 'percentage' || cls === 'relative' || cls === 'keyword') {
    return { value, preserved: `${prop}:${cls}` };
  }

  if (cls === 'variable' || cls === 'calc') {
    return { value, blocked: `${prop}:${cls}` };
  }

  // Shorthands such as padding/radius/backgroundSize may contain several px
  // tokens plus ratios/keywords. Scale absolute px components only.
  const tokens = scaleAbsoluteTokens(value, factor, false);
  if (tokens.blocked) return { value, blocked: `${prop}:relative-compound` };
  if (tokens.changed) return { value: tokens.value };
  return { value, preserved: `${prop}:unscaled-compound` };
}

function scaleBorderShorthand(prop: string, value: string, factor: number): { value: string; blocked?: string; preserved?: string } {
  if (/var\(|calc\(|min\(|max\(|clamp\(/i.test(value)) return { value, blocked: `${prop}:expression` };
  const m = /(^|\s)([+-]?(?:\d+|\d*\.\d+))px(?=\s|$)/i.exec(value);
  if (!m) return { value, preserved: `${prop}:no-dimensional-width` };
  const scaled = formatScalePx(Number.parseFloat(m[2]) * factor);
  return { value: value.slice(0, m.index + m[1].length) + scaled + value.slice(m.index + m[0].length) };
}

function splitTopLevelCommas(value: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      result.push(value.slice(start, i));
      start = i + 1;
    }
  }
  result.push(value.slice(start));
  return result;
}

function scaleShadow(prop: string, value: string, factor: number): { value: string; blocked?: string } {
  if (/var\(|calc\(|min\(|max\(|clamp\(/i.test(value)) return { value, blocked: `${prop}:expression` };
  const shadows = splitTopLevelCommas(value).map((shadow) => {
    // CSS shadow geometry is x, y, blur, spread (text-shadow has no spread).
    let count = 0;
    return shadow.replace(/([+-]?(?:\d+|\d*\.\d+))px\b/gi, (full, nRaw: string) => {
      if (count >= 4) return full;
      count += 1;
      return formatScalePx(Number.parseFloat(nRaw) * factor);
    });
  });
  return { value: shadows.join(',') };
}

function scaleFilter(prop: string, value: string, factor: number): { value: string; blocked?: string } {
  if (/var\(|calc\(|min\(|max\(|clamp\(/i.test(value)) return { value, blocked: `${prop}:expression` };
  let next = value.replace(/blur\(\s*([+-]?(?:\d+|\d*\.\d+))px\s*\)/gi, (_m, nRaw: string) => `blur(${formatScalePx(Number.parseFloat(nRaw) * factor)})`);
  next = next.replace(/drop-shadow\(([^)]*)\)/gi, (_m, inner: string) => {
    let count = 0;
    const scaled = inner.replace(/([+-]?(?:\d+|\d*\.\d+))px\b/gi, (full, nRaw: string) => {
      if (count >= 4) return full;
      count += 1;
      return formatScalePx(Number.parseFloat(nRaw) * factor);
    });
    return `drop-shadow(${scaled})`;
  });
  return { value: next };
}

function scaleTransform(value: string, factor: number): { value: string; blocked?: string } {
  if (/perspective\(|matrix3d\(|rotate[XY]\(|translateZ\(|translate3d\(|scale3d\(/i.test(value)) {
    return { value, blocked: 'transform:3d-or-perspective' };
  }
  if (/var\(|calc\(|min\(|max\(|clamp\(/i.test(value)) return { value, blocked: 'transform:expression' };

  // Uniform Scale preserves rotation/skew/scale channels and only scales
  // authored dimensional translations. Matrix e/f are translation channels.
  const matrix = /^\s*matrix\(([^)]*)\)\s*$/i.exec(value);
  if (matrix) {
    const nums = matrix[1].split(',').map((part) => Number.parseFloat(part.trim()));
    if (nums.length !== 6 || !nums.every(Number.isFinite)) return { value, blocked: 'transform:invalid-matrix' };
    nums[4] *= factor;
    nums[5] *= factor;
    return { value: `matrix(${nums.map((n) => formatScaleNumber(n, 6)).join(', ')})` };
  }
  const next = value.replace(/(translate(?:X|Y)?\(\s*)([+-]?(?:\d+|\d*\.\d+))px/gi, (_m, prefix: string, nRaw: string) => {
    return `${prefix}${formatScalePx(Number.parseFloat(nRaw) * factor)}`;
  });
  return { value: next };
}

function scaleDasharray(value: string, factor: number): { value: string; blocked?: string } {
  if (/var\(|calc\(/i.test(value)) return { value, blocked: 'strokeDasharray:expression' };
  const parts = value.split(/([,\s]+)/);
  return {
    value: parts.map((part) => {
      const cls = classifyScaleValue(part);
      if (cls === 'px') return formatScalePx(Number.parseFloat(part) * factor);
      if (cls === 'number') return formatScaleNumber(Number.parseFloat(part) * factor);
      return part;
    }).join(''),
  };
}


function readSvgAttr(attrs: Readonly<Record<string, string>>, kebab: string, camel: string): string | undefined {
  return attrs[kebab] ?? attrs[camel];
}

function scaleSvgMetric(
  label: string,
  value: string,
  factor: number,
): { value: string; blocked?: string; preserved?: string } {
  const cls = classifyScaleValue(value);
  if (cls === 'zero') return { value: '0' };
  if (cls === 'number') return { value: formatScaleNumber(Number.parseFloat(value) * factor) };
  if (cls === 'px') return { value: formatScalePx(Number.parseFloat(value) * factor) };
  if (cls === 'percentage') return { value, preserved: `${label}:percentage` };
  return { value, blocked: `${label}:${cls}` };
}

/**
 * Bake a native SVG shape's authored coordinate-space metrics for Scale.
 *
 * Live Scale preview intentionally leaves these alone: doubling only the outer
 * viewport already paints the correct proportional preview. On COMMIT we also
 * multiply the viewBox + inner geometry/metrics by the same factor. That keeps
 * the viewBox->viewport mapping unchanged while making source values truthful
 * (e.g. stroke-width 2 -> 4, rect rx 10 -> 20) instead of relying on an
 * implicit viewport magnification.
 */
export function planScaledSvgShapeAttrs(
  tag: string,
  attrs: Readonly<Record<string, string>>,
  factor: number,
): ScaleSvgAttrPolicyResult {
  const out: Record<string, string> = {
    ...scaleShapeGeometry(tag, { ...attrs }, factor, factor),
  };
  const blocked: string[] = [];
  const preserved: string[] = [];

  const scaleMetric = (kebab: string, camel: string) => {
    const raw = readSvgAttr(attrs, kebab, camel);
    if (raw == null || raw === '') return;
    const result = scaleSvgMetric(kebab, raw, factor);
    if (result.blocked) blocked.push(result.blocked);
    if (result.preserved) preserved.push(result.preserved);
    if (!result.blocked && result.value !== raw) out[kebab] = result.value;
  };

  scaleMetric('stroke-width', 'strokeWidth');
  scaleMetric('stroke-dashoffset', 'strokeDashoffset');

  const dasharray = readSvgAttr(attrs, 'stroke-dasharray', 'strokeDasharray');
  if (dasharray != null && dasharray !== '' && dasharray !== 'none') {
    const result = scaleDasharray(dasharray, factor);
    if (result.blocked) blocked.push(result.blocked);
    if (result.preserved) preserved.push(result.preserved);
    if (!result.blocked && result.value !== dasharray) out['stroke-dasharray'] = result.value;
  }

  return { attrs: out, blocked, preserved };
}

/** Multiply all four authored viewBox coordinates by the same Scale factor. */
export function scaleSvgViewBox(viewBox: string | undefined, factor: number): string | null {
  if (!viewBox || !Number.isFinite(factor) || factor < 0) return null;
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || !parts.every(Number.isFinite) || parts[2] <= 0 || parts[3] <= 0) return null;
  return parts.map((n) => formatScaleNumber(n * factor)).join(' ');
}

/** Scale a node's authored inline style map. No computed-value flattening. */
export function planScaledStyles(
  styles: Readonly<Record<string, string>>,
  factor: number,
  options: { excludeRootOffsets?: boolean; excludeGeometry?: boolean; includeUnchanged?: boolean } = {},
): ScalePolicyResult {
  const out: Record<string, string> = {};
  const blocked: string[] = [];
  const preserved: string[] = [];

  for (const [prop, value] of Object.entries(styles)) {
    if (!isScaleDimensionalProperty(prop)) continue;
    if (options.excludeGeometry && ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'left', 'top', 'right', 'bottom'].includes(prop)) continue;
    if (options.excludeRootOffsets && ['left', 'top', 'right', 'bottom', 'inset', 'insetInline', 'insetBlock', 'insetInlineStart', 'insetInlineEnd', 'insetBlockStart', 'insetBlockEnd'].includes(prop)) continue;

    let result: { value: string; blocked?: string; preserved?: string };
    if (COMPOUND_BORDER_PROPS.has(prop)) result = scaleBorderShorthand(prop, value, factor);
    else if (SHADOW_PROPS.has(prop)) result = scaleShadow(prop, value, factor);
    else if (FILTER_PROPS.has(prop)) result = scaleFilter(prop, value, factor);
    else if (prop === 'strokeDasharray') result = scaleDasharray(value, factor);
    else if (prop === 'transform') result = scaleTransform(value, factor);
    else result = scaleSimpleDimensional(prop, value, factor);

    if (result.blocked) blocked.push(result.blocked);
    if (result.preserved) preserved.push(result.preserved);
    // Live Scale preview must be a COMPLETE projection of the immutable
    // gesture snapshot. `includeUnchanged` therefore carries unchanged/
    // semantically-preserved dimensional values too, so dragging 2× -> 1×
    // restores the original DOM instead of leaving the prior 2× patch behind.
    if (!result.blocked && (result.value !== value || options.includeUnchanged)) out[prop] = result.value;
  }

  return { styles: out, blocked, preserved };
}

export function scalableBoundProperties(
  styleVariables: Readonly<Record<string, string>> | null | undefined,
): string[] {
  if (!styleVariables) return [];
  return Object.keys(styleVariables).filter(isScaleDimensionalProperty);
}

export function unsafeScaleChannelProperties(node: {
  motionVariants?: Record<string, Record<string, string>> | null;
  conditionalStyles?: Record<string, Record<string, string>> | null;
  responsivePropStyles?: Record<number, Record<string, string>> | null;
}): string[] {
  const unsafe = new Set<string>();
  for (const map of Object.values(node.motionVariants ?? {})) {
    for (const prop of Object.keys(map ?? {})) if (isScaleDimensionalProperty(prop)) unsafe.add(`motion:${prop}`);
  }
  for (const prop of Object.keys(node.conditionalStyles ?? {})) {
    if (isScaleDimensionalProperty(prop)) unsafe.add(`conditional:${prop}`);
  }
  for (const map of Object.values(node.responsivePropStyles ?? {})) {
    for (const prop of Object.keys(map ?? {})) if (isScaleDimensionalProperty(prop)) unsafe.add(`responsive:${prop}`);
  }
  return Array.from(unsafe);
}

export function parseAuthoredPx(value: string | undefined): number | null {
  if (value == null) return null;
  const cls = classifyScaleValue(value);
  if (cls === 'zero') return 0;
  if (cls !== 'px') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function scaleAuthoredPx(value: string | undefined, factor: number): string | null {
  const n = parseAuthoredPx(value);
  return n == null ? null : formatScalePx(n * factor);
}
