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
  /** Existing identity artwork; accents never invent missing PNG asset paths. */
  brandAssetId?: string;
  light: BuilderThemeColors;
  dark: BuilderThemeColors;
}

export const BUILDER_THEMES: BuilderTheme[] = [
  {
    id: 'monochrome',
    label: 'Monochrome',
    light: { accent: '#686868', accentFg: '#f6f6f6', accentTextFg: '#f6f6f6' },
    dark: { accent: '#686868', accentFg: '#f6f6f6', accentTextFg: '#f6f6f6' },
  },
  {
    id: 'teal',
    label: 'Teal',
    light: { accent: '#1c8c93', accentFg: '#e0ffef', accentTextFg: '#111111' },
    dark: { accent: '#1c8c93', accentFg: '#e0ffef', accentTextFg: '#111111' },
  },
  {
    id: 'sienna',
    label: 'Sienna',
    light: { accent: '#b5471f', accentFg: '#f9dcbd', accentTextFg: '#ffffff' },
    dark: { accent: '#b5471f', accentFg: '#f9dcbd', accentTextFg: '#ffffff' },
  },
  {
    id: 'gold',
    label: 'Gold',
    light: { accent: '#edb713', accentFg: '#fffbe1', accentTextFg: '#111111' },
    dark: { accent: '#edb713', accentFg: '#fffbe1', accentTextFg: '#111111' },
  },
  {
    id: 'green', label: 'Green', brandAssetId: 'monochrome',
    // Terra Core color/green VariableID:530:12, verified 2026-10-02.
    light: { accent: '#3bcb8d', accentFg: '#111111', accentTextFg: '#111111' },
    dark: { accent: '#3bcb8d', accentFg: '#111111', accentTextFg: '#111111' },
  },
  {
    id: 'pink', label: 'Pink · Terra coral', brandAssetId: 'monochrome',
    // Terra Core color/coral VariableID:530:13, not an invented pink token.
    light: { accent: '#ff6f78', accentFg: '#111111', accentTextFg: '#111111' },
    dark: { accent: '#ff6f78', accentFg: '#111111', accentTextFg: '#111111' },
  },
  {
    id: 'neutrachrome', label: 'Neutrachrome', brandAssetId: 'monochrome',
    light: { accent: '#69635b', accentFg: '#faf9f7', accentTextFg: '#faf9f7' },
    dark: { accent: '#c7beb0', accentFg: '#181613', accentTextFg: '#181613' },
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
