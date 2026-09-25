export type EditorThemeMode = 'light' | 'dark';
export type EditorNeutralLevel = '1' | '2' | '3';

export const DEFAULT_EDITOR_THEME_MODE: EditorThemeMode = 'dark';
export const DEFAULT_EDITOR_NEUTRAL_LEVEL: EditorNeutralLevel = '2';

export const EDITOR_THEME_MODES: readonly EditorThemeMode[] = ['light', 'dark'] as const;
export const EDITOR_NEUTRAL_LEVELS: readonly EditorNeutralLevel[] = ['1', '2', '3'] as const;

export function normalizeEditorThemeMode(value: unknown): EditorThemeMode {
  return value === 'light' || value === 'dark' ? value : DEFAULT_EDITOR_THEME_MODE;
}

export function normalizeEditorNeutralLevel(value: unknown): EditorNeutralLevel {
  return value === '1' || value === '2' || value === '3'
    ? value
    : DEFAULT_EDITOR_NEUTRAL_LEVEL;
}

export const EDITOR_NEUTRAL_SWATCHES: Record<EditorThemeMode, Record<EditorNeutralLevel, string>> = {
  light: { '1': '#fbfbfb', '2': '#f7f7f7', '3': '#eeeeee' },
  dark: { '1': '#2b2b2b', '2': '#242424', '3': '#1d1d1d' },
};
