// paint-opacity.ts — deterministic paint-local opacity encoding for Inspector rows.
//
// CSS does not expose a generic "background paint opacity" longhand. field therefore
// keeps opacity attached to a single solid paint with color-mix(), which preserves
// token identity (`var(--token)`) instead of baking a linked color to a literal.
// SVG fill/stroke use their native fill-opacity / stroke-opacity attributes instead.

import { parseColor, rgbaToHex, toHexDisplay } from './color-utils';

export interface PaintOpacityState {
  /** Underlying solid paint with opacity removed. */
  base: string;
  /** 0..100. */
  opacity: number;
  /** false for gradients/images/CSS-wide values that cannot use this encoding. */
  adjustable: boolean;
}

const MIX_RE = /^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+(-?\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)$/i;

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function isUnsupportedPaint(v: string): boolean {
  const low = v.trim().toLowerCase();
  return !low
    || low === 'none'
    || low === 'inherit'
    || low === 'initial'
    || low === 'unset'
    || low.includes('gradient(')
    || low.includes('url(');
}

/** Split a solid CSS paint into opaque base + paint-local opacity. */
export function splitPaintOpacity(value: string): PaintOpacityState {
  const raw = (value ?? '').trim();
  if (isUnsupportedPaint(raw)) return { base: raw, opacity: 100, adjustable: false };

  const mix = raw.match(MIX_RE);
  if (mix) {
    const base = mix[1].trim();
    return { base, opacity: clampPercent(Number.parseFloat(mix[2])), adjustable: !isUnsupportedPaint(base) };
  }

  // Tokens are adjustable without resolving them: serializePaintOpacity wraps
  // the var() in color-mix(), so the source identity survives intact.
  if (/^var\(\s*--[^)]+\)$/i.test(raw)) {
    return { base: raw, opacity: 100, adjustable: true };
  }

  // Existing alpha-bearing literals are normalized into an opaque base + %.
  // This makes old rgba/#RRGGBBAA authored values participate in the new row
  // without requiring a migration.
  const display = toHexDisplay(raw);
  if (/^#[0-9a-f]{8}$/i.test(display)) {
    const alpha = Number.parseInt(display.slice(7, 9), 16) / 255;
    return { base: display.slice(0, 7), opacity: clampPercent(alpha * 100), adjustable: true };
  }
  if (/^rgba?\(/i.test(raw) || /^hsla?\(/i.test(raw) || /^#[0-9a-f]{3,8}$/i.test(raw) || /^[a-z]+$/i.test(raw)) {
    const { rgb, alpha } = parseColor(display);
    return { base: rgbaToHex(rgb, 1), opacity: clampPercent(alpha * 100), adjustable: true };
  }

  return { base: raw, opacity: 100, adjustable: false };
}

/**
 * Serialize a solid paint at a requested paint-local opacity.
 * 100% collapses back to the bare base. Lower values use standards-based
 * color-mix() so token references remain first-class in source.
 */
export function serializePaintOpacity(value: string, opacity: number): string {
  const state = splitPaintOpacity(value);
  if (!state.adjustable) return value;
  const pct = clampPercent(opacity);
  if (pct >= 100) return state.base;
  return `color-mix(in srgb, ${state.base} ${pct}%, transparent)`;
}

export function paintOpacityPercent(value: string): number {
  return splitPaintOpacity(value).opacity;
}

export function paintOpacityBase(value: string): string {
  return splitPaintOpacity(value).base;
}

/** Serialize opacity into the literal color itself (#RRGGBBAA). Use this for
 * controls whose existing editor already understands alpha-bearing literals
 * but does not yet unwrap color-mix() (border/text stroke). Token refs are
 * deliberately rejected so changing local opacity never destroys linkage. */
export function serializeLiteralPaintOpacity(value: string, opacity: number): string {
  const state = splitPaintOpacity(value);
  if (!state.adjustable || /^var\(\s*--/i.test(state.base)) return value;
  const normalized = toHexDisplay(state.base);
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return value;
  const { rgb } = parseColor(normalized);
  return rgbaToHex(rgb, clampPercent(opacity) / 100);
}

export function canAdjustLiteralPaintOpacity(value: string): boolean {
  const state = splitPaintOpacity(value);
  return state.adjustable && !/^var\(\s*--/i.test(state.base) && /^#[0-9a-f]{6}$/i.test(toHexDisplay(state.base));
}

export function canAdjustPaintOpacity(value: string): boolean {
  return splitPaintOpacity(value).adjustable;
}
