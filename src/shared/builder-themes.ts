// builder-themes.ts — accent palettes for Revyme editor chrome.
//
// Figma-first skin: one neutral Graphite default + three restrained Terra
// accents. These theme the BUILDER chrome only, never the user's website.

export interface BuilderThemeColors {
  accent: string;
  accentFg: string;
}

export interface BuilderTheme {
  id: string;
  label: string;
  light: BuilderThemeColors;
  dark: BuilderThemeColors;
}

export const BUILDER_THEMES: BuilderTheme[] = [
  {
    // Default/reset. The stylesheet owns mode-specific Graphite values:
    // dark active tools are near-white; light active tools are charcoal.
    id: 'graphite',
    label: 'Graphite',
    light: { accent: '#2c2c2c', accentFg: '#ffffff' },
    dark: { accent: '#f0f0f0', accentFg: '#111111' },
  },
  {
    id: 'teal',
    label: 'Teal',
    light: { accent: '#2f7d73', accentFg: '#ffffff' },
    dark: { accent: '#2f7d73', accentFg: '#ffffff' },
  },
  {
    id: 'sienna',
    label: 'Sienna',
    light: { accent: '#a4563f', accentFg: '#ffffff' },
    dark: { accent: '#a4563f', accentFg: '#ffffff' },
  },
  {
    id: 'amber',
    label: 'Amber',
    light: { accent: '#b88a2a', accentFg: '#111111' },
    dark: { accent: '#b88a2a', accentFg: '#111111' },
  },
];

export const DEFAULT_BUILDER_THEME_ID = 'graphite';

/* Dark accent text is lifted toward white for mid-dark chromatic accents. */
export const DARK_ACCENT_TEXT_MIX = 0.5;

export function getBuilderThemeById(id: string): BuilderTheme | undefined {
  return BUILDER_THEMES.find((t) => t.id === id);
}
