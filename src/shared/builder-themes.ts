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
