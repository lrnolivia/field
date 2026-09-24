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
    // Monochrome without the giant white slabs: medium graphite + white ink.
    id: 'graphite',
    label: 'Graphite',
    light: { accent: '#6b6b6b', accentFg: '#ffffff' },
    dark: { accent: '#6b6b6b', accentFg: '#ffffff' },
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

export const DARK_ACCENT_TEXT_MIX = 0.5;

export function getBuilderThemeById(id: string): BuilderTheme | undefined {
  return BUILDER_THEMES.find((t) => t.id === id);
}
