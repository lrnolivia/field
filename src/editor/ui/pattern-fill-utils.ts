// pattern-fill-utils.ts — Native Pattern Fill compiler.
//
// field owns the semantic Fill model. Commodity pattern artwork comes from
// existing field recipes or permissively licensed catalogs, then compiles to
// ordinary CSS/SVG so Preview and production remain real web output.

export type PatternKind =
  | 'grid'
  | 'dots'
  | 'crosses'
  | 'diagonal'
  | 'gridMask'
  | 'honeycomb'
  | 'checkerboard';

export interface FieldPatternFillConfig {
  v: 1;
  source: 'field';
  kind: PatternKind;
  color: string;
  background: string;
  opacity: number;
  tileSize: number;
  thickness: number;
}

export type PatternMonsterMode = 'stroke' | 'stroke-join' | 'fill';

export interface PatternMonsterDefinition {
  title: string;
  slug: string;
  mode: PatternMonsterMode;
  maxStroke: number;
  maxScale: number;
  maxSpacing: [number, number];
  width: number;
  height: number;
  vHeight: number;
  tags: string[];
  path: string;
}

export interface PatternMonsterFillConfig {
  v: 1;
  source: 'pattern-monster';
  patternId: string;
  colors: string[];
  colorCount: number;
  stroke: number;
  scale: number;
  spacing: [number, number];
  angle: number;
  join: 1 | 2;
  moveLeft: number;
  moveTop: number;
}

export type PatternFillConfig = FieldPatternFillConfig | PatternMonsterFillConfig;

export const PATTERN_KIND_OPTIONS: Array<{ value: PatternKind; label: string }> = [
  { value: 'grid', label: 'Grid' },
  { value: 'dots', label: 'Dots' },
  { value: 'crosses', label: 'Crosses' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'gridMask', label: 'Grid + Mask' },
  { value: 'honeycomb', label: 'Honeycomb' },
  { value: 'checkerboard', label: 'Checkerboard' },
];

export const DEFAULT_PATTERN_FILL: FieldPatternFillConfig = {
  v: 1,
  source: 'field',
  kind: 'grid',
  color: '#7C3AED',
  background: 'transparent',
  opacity: 0.5,
  tileSize: 20,
  thickness: 1,
};

// Pattern Monster's own default light palette. Kept here because applying an
// upstream catalog entry should start from the same visual defaults as upstream.
export const PATTERN_MONSTER_DEFAULT_COLORS = [
  'hsla(0,0%,100%,1)',
  'hsla(258.5,59.4%,59.4%,1)',
  'hsla(339.6,82.2%,51.6%,1)',
  'hsla(198.7,97.6%,48.4%,1)',
  'hsla(47,80.9%,61%,1)',
];

const KINDS = new Set<PatternKind>(PATTERN_KIND_OPTIONS.map(o => o.value));

export function defaultPatternMonsterFill(definition: PatternMonsterDefinition): PatternMonsterFillConfig {
  const maxColors = patternMonsterMaxColors(definition);
  return {
    v: 1,
    source: 'pattern-monster',
    patternId: definition.slug,
    colors: PATTERN_MONSTER_DEFAULT_COLORS.slice(0, Math.max(2, maxColors)),
    colorCount: maxColors,
    stroke: 1,
    scale: Math.min(2, definition.maxScale),
    spacing: [0, 0],
    angle: 0,
    join: 1,
    moveLeft: 0,
    moveTop: 0,
  };
}

export function parsePatternFillConfig(raw?: string | null): PatternFillConfig {
  if (!raw) return { ...DEFAULT_PATTERN_FILL };
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.source === 'pattern-monster' && typeof value.patternId === 'string' && value.patternId) {
      const colors = Array.isArray(value.colors)
        ? value.colors.filter((color): color is string => typeof color === 'string' && !!color)
        : [];
      const spacing = Array.isArray(value.spacing) ? value.spacing : [];
      return {
        v: 1,
        source: 'pattern-monster',
        patternId: value.patternId,
        colors: colors.length >= 2 ? colors.slice(0, 5) : [...PATTERN_MONSTER_DEFAULT_COLORS],
        colorCount: clampNumber(value.colorCount, 2, 5, colors.length || 2),
        stroke: clampNumber(value.stroke, 0.5, 32, 1),
        scale: clampNumber(value.scale, 1, 64, 2),
        spacing: [
          clampNumber(spacing[0], 0, 500, 0),
          clampNumber(spacing[1], 0, 500, 0),
        ],
        angle: clampNumber(value.angle, 0, 180, 0),
        join: value.join === 2 ? 2 : 1,
        moveLeft: clampNumber(value.moveLeft, -10000, 0, 0),
        moveTop: clampNumber(value.moveTop, -10000, 0, 0),
      };
    }

    const fieldValue = value as Partial<FieldPatternFillConfig>;
    return {
      v: 1,
      source: 'field',
      kind: KINDS.has(fieldValue.kind as PatternKind) ? fieldValue.kind as PatternKind : DEFAULT_PATTERN_FILL.kind,
      color: typeof fieldValue.color === 'string' && fieldValue.color ? fieldValue.color : DEFAULT_PATTERN_FILL.color,
      background: typeof fieldValue.background === 'string' && fieldValue.background ? fieldValue.background : DEFAULT_PATTERN_FILL.background,
      opacity: clampNumber(fieldValue.opacity, 0, 1, DEFAULT_PATTERN_FILL.opacity),
      tileSize: clampNumber(fieldValue.tileSize, 4, 120, DEFAULT_PATTERN_FILL.tileSize),
      thickness: clampNumber(fieldValue.thickness, 0.5, 12, DEFAULT_PATTERN_FILL.thickness),
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

export const EMPTY_PATTERN_STYLES: PatternFillStyles = {
  backgroundColor: 'transparent',
  backgroundImage: '',
  backgroundSize: '',
  backgroundPosition: '',
  backgroundRepeat: '',
  WebkitMaskImage: '',
  maskImage: '',
};

export function buildPatternFillStyles(
  input: PatternFillConfig,
  definition?: PatternMonsterDefinition | null,
): PatternFillStyles {
  const config = parsePatternFillConfig(JSON.stringify(input));
  if (config.source === 'pattern-monster') {
    return definition ? buildPatternMonsterFillStyles(config, definition) : EMPTY_PATTERN_STYLES;
  }
  return buildFieldPatternFillStyles(config);
}

function buildFieldPatternFillStyles(config: FieldPatternFillConfig): PatternFillStyles {
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

/**
 * TypeScript port of Pattern Monster's MIT-licensed `svgPattern` function.
 * The geometry/color fallback rules intentionally mirror upstream rather than
 * approximating them. The catalog itself is lazy-loaded by the Libraries UI.
 */
export function buildPatternMonsterFillStyles(
  input: PatternMonsterFillConfig,
  definition: PatternMonsterDefinition,
): PatternFillStyles {
  const paths = definition.path.split('~');
  const maxColors = paths.length + 1;
  const colorCount = Math.round(clampNumber(input.colorCount, 2, maxColors, maxColors));
  const colors = normalizedMonsterColors(input.colors, maxColors);
  const stroke = clampNumber(input.stroke, 0.5, definition.maxStroke, 1);
  const scale = clampNumber(input.scale, 1, definition.maxScale, Math.min(2, definition.maxScale));
  const spacing: [number, number] = [
    clampNumber(input.spacing[0], 0, definition.maxSpacing[0], 0),
    clampNumber(input.spacing[1], 0, definition.maxSpacing[1], 0),
  ];
  const angle = clampNumber(input.angle, 0, 180, 0);
  const join: 1 | 2 = input.join === 2 ? 2 : 1;
  const moveLeft = clampNumber(input.moveLeft, definition.width * -2, 0, 0);
  const moveTop = clampNumber(input.moveTop, definition.height * -2, 0, 0);

  const pathCount = definition.vHeight === 0 && maxColors > 2 ? maxColors - 1 : colorCount - 1;
  let strokeGroup = '';
  for (let i = 0; i < Math.min(pathCount, paths.length); i++) {
    let defColor = colors[i + 1];
    if (definition.vHeight === 0 && maxColors > 2) {
      if (colorCount === 3 && maxColors === 4 && i === 2) defColor = colors[1];
      else if (colorCount === 4 && maxColors === 5 && i === 3) defColor = colors[1];
      else if (colorCount === 3 && maxColors === 5 && i === 3) defColor = colors[1];
      else if (colorCount === 3 && maxColors === 5 && i === 2) defColor = colors[1];
      else if (colorCount === 2) defColor = colors[1];
    }

    let paint = '';
    let joinMode = '';
    if (definition.mode === 'stroke-join') {
      paint = ` stroke='${defColor}' fill='none'`;
      joinMode = join === 2
        ? "stroke-linejoin='round' stroke-linecap='round' "
        : "stroke-linecap='square' ";
    } else if (definition.mode === 'stroke') {
      paint = ` stroke='${defColor}' fill='none'`;
    } else {
      paint = ` stroke='none' fill='${defColor}'`;
    }

    strokeGroup += paths[i]
      .replace('/>', ` transform='translate(${spacing[0] / 2},0)' ${joinMode}stroke-width='${stroke}'${paint}/>`)
      .replace("transform='translate(0,0)' ", ' ');
  }

  const patternWidth = definition.width + spacing[0];
  const patternHeight = definition.height - definition.vHeight * (maxColors - colorCount) + spacing[1];
  const svg = `<svg width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='a' patternUnits='userSpaceOnUse' width='${patternWidth}' height='${patternHeight}' patternTransform='scale(${scale}) rotate(${angle})'><rect x='0' y='0' width='100%' height='100%' fill='${colors[0]}'/>${strokeGroup}</pattern></defs><rect width='800%' height='800%' transform='translate(${scale * moveLeft},${scale * moveTop})' fill='url(#a)'/></svg>`;

  return {
    backgroundColor: colors[0],
    backgroundImage: svgDataUrl(svg),
    backgroundSize: '',
    backgroundPosition: '',
    backgroundRepeat: 'repeat',
    WebkitMaskImage: '',
    maskImage: '',
  };
}

export function patternMonsterMaxColors(definition: PatternMonsterDefinition): number {
  return Math.min(5, Math.max(2, definition.path.split('~').length + 1));
}

function normalizedMonsterColors(colors: string[], maxColors: number): string[] {
  const next = [...colors];
  while (next.length < maxColors) next.push(PATTERN_MONSTER_DEFAULT_COLORS[next.length] || PATTERN_MONSTER_DEFAULT_COLORS[1]);
  return next.slice(0, Math.max(2, maxColors));
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
