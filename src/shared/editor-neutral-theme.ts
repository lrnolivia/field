export type EditorThemeMode = 'light' | 'dark';
export type EditorNeutralLevel = '1' | '2' | '3' | '4' | '5';

export const DEFAULT_EDITOR_THEME_MODE: EditorThemeMode = 'dark';
export const DEFAULT_EDITOR_NEUTRAL_LEVEL: EditorNeutralLevel = '3';

export const EDITOR_THEME_MODES: readonly EditorThemeMode[] = ['light', 'dark'] as const;
export const EDITOR_NEUTRAL_LEVELS: readonly EditorNeutralLevel[] = ['1', '2', '3', '4', '5'] as const;

export function normalizeEditorThemeMode(value: unknown): EditorThemeMode {
  return value === 'light' || value === 'dark' ? value : DEFAULT_EDITOR_THEME_MODE;
}

export function normalizeEditorNeutralLevel(value: unknown): EditorNeutralLevel {
  return value === '1' || value === '2' || value === '3' || value === '4' || value === '5'
    ? value
    : DEFAULT_EDITOR_NEUTRAL_LEVEL;
}

export const EDITOR_NEUTRAL_SWATCHES: Record<EditorThemeMode, Record<EditorNeutralLevel, string>> = {
  light: {
    '1': '#ffffff',
    '2': '#fafafa',
    '3': '#f4f4f4',
    '4': '#e9e9e9',
    '5': '#dddddd',
  },
  dark: {
    '1': '#303030',
    '2': '#2a2a2a',
    '3': '#242424',
    '4': '#1e1e1e',
    '5': '#181818',
  },
};
