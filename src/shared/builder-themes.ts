// builder-themes.ts — accent palettes for field editor chrome.
//
// These theme the field EDITOR only, never the user's website.
// The theme id also owns field's matching app-icon / wordmark identity.

export interface BuilderThemeColors {
  /** Canonical field primary colour. */
  accent: string;

  /** Exact foreground used by the field identity artwork. */
  accentFg: string;

  /** Foreground reserved for normal-size readable text on accent fills. */
  accentTextFg: string;
}

export interface BuilderTheme {
  id: string;
  label: string;
  /** Optional alias for existing identity artwork. All current palettes have SVG assets. */
  brandAssetId?: string;
  light: BuilderThemeColors;
  dark: BuilderThemeColors;
}

export const BUILDER_THEMES: BuilderTheme[] = [
  {
    id: 'monochrome',
    label: 'monochrome',
    light: { accent: '#404040', accentFg: '#f6f6f6', accentTextFg: '#f6f6f6' },
    dark: { accent: '#404040', accentFg: '#f6f6f6', accentTextFg: '#f6f6f6' },
  },
  {
    id: 'neutrachrome', label: 'lunar chrome',
    light: { accent: '#69635b', accentFg: '#faf9f7', accentTextFg: '#181613' },
    dark: { accent: '#c7beb0', accentFg: '#181613', accentTextFg: '#181613' },
  },
  {
    id: 'teal',
    label: 'aqua teal',
    light: { accent: '#1c8c93', accentFg: '#e0ffef', accentTextFg: '#f6f6f6' },
    dark: { accent: '#1c8c93', accentFg: '#e0ffef', accentTextFg: '#f6f6f6' },
  },
  {
    id: 'sienna',
    label: 'sienna solstice',
    light: { accent: '#b5471f', accentFg: '#f9dcbd', accentTextFg: '#ffffff' },
    dark: { accent: '#b5471f', accentFg: '#f9dcbd', accentTextFg: '#ffffff' },
  },
  {
    id: 'gold',
    label: 'gold halo',
    light: { accent: '#edb713', accentFg: '#fffbe1', accentTextFg: '#111111' },
    dark: { accent: '#edb713', accentFg: '#fffbe1', accentTextFg: '#111111' },
  },
  {
    id: 'green', label: 'flora green',
    // Terra Core color/green VariableID:530:12, verified 2026-10-02.
    light: { accent: '#3bcb8d', accentFg: '#f6f6f6', accentTextFg: '#f6f6f6' },
    dark: { accent: '#3bcb8d', accentFg: '#f6f6f6', accentTextFg: '#f6f6f6' },
  },
  {
    id: 'pink', label: 'terra coral',
    // Terra Core color/coral VariableID:530:13, not an invented pink token.
    light: { accent: '#ff6f78', accentFg: '#f6f6f6', accentTextFg: '#f6f6f6' },
    dark: { accent: '#ff6f78', accentFg: '#f6f6f6', accentTextFg: '#f6f6f6' },
  },

];

export const DEFAULT_BUILDER_THEME_ID = 'monochrome';

export const DARK_ACCENT_TEXT_MIX = 0.5;

/**
 * Preserve existing user preferences across the theme rename.
 *
 * These aliases may be removed only after a deliberate preference migration.
 */
export function normalizeBuilderThemeId(id: string): string {
  if (id === 'graphite') return 'monochrome';
  if (id === 'amber') return 'gold';
  return id;
}

export function getBuilderThemeById(id: string): BuilderTheme | undefined {
  const normalized = normalizeBuilderThemeId(id);
  return BUILDER_THEMES.find((t) => t.id === normalized);
}


export function builderThemeBrandId(theme: BuilderTheme): string {
  return theme.brandAssetId ?? theme.id;
}

/** Adjust chrome fills only as far as readable foregrounds require.
 * Canonical hues remain in the catalog and identity artwork. */
export function builderAccentSurface(accent: string, foreground: string): string {
  const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const luminance = (rgb: number[]) => rgb.map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
  const base = channels(accent), text = luminance(channels(foreground));
  for (let amount = 0; amount <= 100; amount++) {
    const pole = text > 0.5 ? 0 : 255;
    const shade = base.map(c => Math.round(c * (1 - amount / 100) + pole * amount / 100));
    const bg = luminance(shade);
    if ((Math.max(bg, text) + 0.05) / (Math.min(bg, text) + 0.05) >= 4.5) {
      return '#' + shade.map(c => c.toString(16).padStart(2, '0')).join('');
    }
  }
  return text > 0.5 ? '#000000' : '#ffffff';
}
