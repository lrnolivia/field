export type LocateDefinitionBlendMode = 'screen' | 'overlay' | 'soft-light';

/**
 * Lightweight literal-color luminance for locate-glow decisions. Returns null
 * for unresolved values such as CSS variables, gradients, currentColor, etc.
 */
export function locateColorLuminance(color: string): number | null {
  const value = color.trim();
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  let channels: number[] | null = null;

  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits.split('').map((v) => v + v).join('');
    }
    if (digits.length === 8 && parseInt(digits.slice(6, 8), 16) / 255 < 0.05) return null;
    channels = [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16));
  } else {
    const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
    if (rgb) {
      if (rgb[4] != null && Number(rgb[4]) < 0.05) return null;
      channels = rgb.slice(1, 4).map(Number);
    }
  }

  return channels
    ? (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) / 255
    : null;
}

/**
 * The tight definition glow should follow the selected paint when it is a real
 * literal color. Near-black and near-white need different blend math to remain
 * visible; unresolved colors fall back to the contrast tone.
 */
export function resolveLocateDefinitionGlow(
  tint: string | null,
  tone: 'white' | 'black',
): { stroke: string; blendMode: LocateDefinitionBlendMode } {
  if (tint) {
    const light = locateColorLuminance(tint);
    if (light !== null) {
      if (light <= 0.035) return { stroke: tint, blendMode: 'overlay' };
      if (light >= 0.965) return { stroke: tint, blendMode: 'soft-light' };
      return { stroke: tint, blendMode: 'screen' };
    }
  }

  return tone === 'black'
    ? { stroke: 'black', blendMode: 'overlay' }
    : { stroke: 'white', blendMode: 'soft-light' };
}


export type LocateGlowRgb = [number, number, number];

function parseLocateRgb(color: string): LocateGlowRgb | null {
  const value = color.trim();
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) digits = digits.split('').map((v) => v + v).join('');
    if (digits.length === 8 && parseInt(digits.slice(6, 8), 16) / 255 < 0.05) return null;
    return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16)) as LocateGlowRgb;
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (!rgb || (rgb[4] != null && Number(rgb[4]) < 0.05)) return null;
  return rgb.slice(1, 4).map((v) => Math.max(0, Math.min(255, Number(v)))) as LocateGlowRgb;
}

function rgbToHsl([r8, g8, b8]: LocateGlowRgb): [number, number, number] {
  const r = r8 / 255; const g = g8 / 255; const b = b8 / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): LocateGlowRgb {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)]
    .map((v) => Math.round(v * 255)) as LocateGlowRgb;
}

/** Bright, electric, but intentionally softened so pure RGB paints do not
 * become a harsh saturated outline. */
export function resolveLocateLuminousRgb(tint: string | null, tone: 'white' | 'black'): LocateGlowRgb {
  if (!tint) return tone === 'white' ? [242, 244, 248] : [44, 46, 52];
  const rgb = parseLocateRgb(tint);
  if (!rgb) return tone === 'white' ? [242, 244, 248] : [44, 46, 52];
  const light = locateColorLuminance(tint);
  if (light != null && light <= 0.035) return [82, 84, 90];
  if (light != null && light >= 0.965) return [246, 247, 249];
  const [h, sat, lum] = rgbToHsl(rgb);
  // Locate should feel electric without reproducing harsh source saturation.
  // Push lightness much higher and pull saturation down: pure RGB blue becomes
  // a luminous periwinkle-blue rather than a nuclear primary outline.
  return hslToRgb([h, Math.min(0.58, sat * 0.56), Math.max(0.68, Math.min(0.82, lum + 0.18))]);
}
