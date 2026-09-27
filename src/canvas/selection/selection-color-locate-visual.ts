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
