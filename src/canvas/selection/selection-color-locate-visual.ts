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

function normalizedRgbDistance(a: LocateGlowRgb, b: LocateGlowRgb): number {
  const d = Math.sqrt(
    (a[0] - b[0]) ** 2
    + (a[1] - b[1]) ** 2
    + (a[2] - b[2]) ** 2,
  );
  return d / (255 * Math.sqrt(3));
}

/**
 * Figma-pass glow color: use the REAL selected paint whenever it has enough
 * perceptual distance from the broad backdrop class. Only fall back to the
 * adaptive black/white contrast color when the paint would disappear (for
 * example black-on-black or white-on-white). No saturation/lightness rewrite.
 */
export function resolveLocateGlowRgb(tint: string | null, tone: 'white' | 'black'): LocateGlowRgb {
  const fallback: LocateGlowRgb = tone === 'white' ? [255, 255, 255] : [0, 0, 0];
  if (!tint) return fallback;
  const rgb = parseLocateRgb(tint);
  if (!rgb) return fallback;
  const backdrop: LocateGlowRgb = tone === 'white' ? [0, 0, 0] : [255, 255, 255];
  return normalizedRgbDistance(rgb, backdrop) < 0.18 ? fallback : rgb;
}
