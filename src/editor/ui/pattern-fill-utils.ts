// pattern-fill-utils.ts — Native Pattern Fill compiler.
//
// Reuses the seven pattern recipes already shipped by field's Pattern code
// component instead of introducing a second pattern engine. Pattern Fill stores
// semantic config in `data-field-pattern`; the website remains ordinary CSS/SVG.

export type PatternKind =
  | 'grid'
  | 'dots'
  | 'crosses'
  | 'diagonal'
  | 'gridMask'
  | 'honeycomb'
  | 'checkerboard';

export interface PatternFillConfig {
  v: 1;
  source: 'field';
  kind: PatternKind;
  color: string;
  background: string;
  opacity: number;
  tileSize: number;
  thickness: number;
}

export const PATTERN_KIND_OPTIONS: Array<{ value: PatternKind; label: string }> = [
  { value: 'grid', label: 'Grid' },
  { value: 'dots', label: 'Dots' },
  { value: 'crosses', label: 'Crosses' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'gridMask', label: 'Grid + Mask' },
  { value: 'honeycomb', label: 'Honeycomb' },
  { value: 'checkerboard', label: 'Checkerboard' },
];

export const DEFAULT_PATTERN_FILL: PatternFillConfig = {
  v: 1,
  source: 'field',
  kind: 'grid',
  color: '#7C3AED',
  background: 'transparent',
  opacity: 0.5,
  tileSize: 20,
  thickness: 1,
};

const KINDS = new Set<PatternKind>(PATTERN_KIND_OPTIONS.map(o => o.value));

export function parsePatternFillConfig(raw?: string | null): PatternFillConfig {
  if (!raw) return { ...DEFAULT_PATTERN_FILL };
  try {
    const value = JSON.parse(raw) as Partial<PatternFillConfig>;
    return {
      v: 1,
      source: 'field',
      kind: KINDS.has(value.kind as PatternKind) ? value.kind as PatternKind : DEFAULT_PATTERN_FILL.kind,
      color: typeof value.color === 'string' && value.color ? value.color : DEFAULT_PATTERN_FILL.color,
      background: typeof value.background === 'string' && value.background ? value.background : DEFAULT_PATTERN_FILL.background,
      opacity: clampNumber(value.opacity, 0, 1, DEFAULT_PATTERN_FILL.opacity),
      tileSize: clampNumber(value.tileSize, 4, 120, DEFAULT_PATTERN_FILL.tileSize),
      thickness: clampNumber(value.thickness, 0.5, 12, DEFAULT_PATTERN_FILL.thickness),
    };
  } catch {
    return { ...DEFAULT_PATTERN_FILL };
  }
}

export function serializePatternFillConfig(config: PatternFillConfig): string {
  return JSON.stringify(parsePatternFillConfig(JSON.stringify(config)));
}

export interface PatternFillStyles {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  WebkitMaskImage: string;
  maskImage: string;
}

export function buildPatternFillStyles(input: PatternFillConfig): PatternFillStyles {
  const config = parsePatternFillConfig(JSON.stringify(input));
  const tile = Math.max(2, config.tileSize);
  const t = Math.max(0.5, config.thickness);
  const fill = alphaColor(config.color, config.opacity);

  let backgroundImage = '';
  let backgroundSize = '';
  let backgroundPosition = '';
  let mask = '';

  switch (config.kind) {
    case 'grid':
      backgroundImage = `linear-gradient(${fill} ${t}px, transparent ${t}px), linear-gradient(90deg, ${fill} ${t}px, transparent ${t}px)`;
      backgroundSize = `${tile}px ${tile}px`;
      break;
    case 'dots':
      backgroundImage = `radial-gradient(circle, ${fill} ${t}px, transparent ${t + 0.5}px)`;
      backgroundSize = `${tile}px ${tile}px`;
      break;
    case 'crosses': {
      const arm = Math.min(tile / 2 - 1, t * 4);
      const half = tile / 2;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}' viewBox='0 0 ${tile} ${tile}'><path d='M${half} ${half - arm}v${arm * 2}M${half - arm} ${half}h${arm * 2}' stroke='${config.color}' stroke-opacity='${config.opacity}' stroke-width='${t}' stroke-linecap='round'/></svg>`;
      backgroundImage = svgDataUrl(svg);
      backgroundSize = `${tile}px ${tile}px`;
      break;
    }
    case 'diagonal':
      backgroundImage = `repeating-linear-gradient(45deg, ${fill} 0, ${fill} ${t}px, transparent ${t}px, transparent ${tile}px)`;
      break;
    case 'gridMask':
      backgroundImage = `linear-gradient(${fill} ${t}px, transparent ${t}px), linear-gradient(90deg, ${fill} ${t}px, transparent ${t}px)`;
      backgroundSize = `${tile}px ${tile}px`;
      mask = 'radial-gradient(ellipse at center, black 30%, transparent 75%)';
      break;
    case 'honeycomb': {
      const w = tile * 2;
      const h = Math.round(tile * 1.732);
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><path d='M${w / 2} ${h * 0.083}L${w} ${h * 0.333}V${h * 0.667}L${w / 2} ${h * 0.917}L0 ${h * 0.667}V${h * 0.333}Z M0 ${h * 0.333}L${w / 2} ${h * 0.083}M${w} ${h * 0.333}L${w / 2} ${h * 0.083}' fill='none' stroke='${config.color}' stroke-opacity='${config.opacity}' stroke-width='${t}'/></svg>`;
      backgroundImage = svgDataUrl(svg);
      backgroundSize = `${w}px ${h}px`;
      break;
    }
    case 'checkerboard':
      backgroundImage = `linear-gradient(45deg, ${fill} 25%, transparent 25%, transparent 75%, ${fill} 75%), linear-gradient(45deg, ${fill} 25%, transparent 25%, transparent 75%, ${fill} 75%)`;
      backgroundSize = `${tile}px ${tile}px`;
      backgroundPosition = `0 0, ${tile / 2}px ${tile / 2}px`;
      break;
  }

  return {
    backgroundColor: config.background,
    backgroundImage,
    backgroundSize,
    backgroundPosition,
    backgroundRepeat: 'repeat',
    WebkitMaskImage: mask,
    maskImage: mask,
  };
}

function alphaColor(color: string, opacity: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, opacity)) * 10000) / 100;
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

function svgDataUrl(svg: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
