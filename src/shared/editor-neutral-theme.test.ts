import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EDITOR_NEUTRAL_LEVEL,
  DEFAULT_EDITOR_THEME_MODE,
  EDITOR_NEUTRAL_LEVELS,
  EDITOR_THEME_MODES,
  normalizeEditorNeutralLevel,
  normalizeEditorThemeMode,
} from './editor-neutral-theme';

describe('editor neutral theme preferences', () => {
  it('keeps Light/Dark and five neutral levels as independent finite axes', () => {
    expect(EDITOR_THEME_MODES).toEqual(['light', 'dark']);
    expect(EDITOR_NEUTRAL_LEVELS).toEqual(['1', '2', '3', '4', '5']);
    expect(DEFAULT_EDITOR_THEME_MODE).toBe('dark');
    expect(DEFAULT_EDITOR_NEUTRAL_LEVEL).toBe('3');
  });

  it('normalizes malformed persisted values to the current defaults', () => {
    expect(normalizeEditorThemeMode('light')).toBe('light');
    expect(normalizeEditorThemeMode('nope')).toBe('dark');
    expect(normalizeEditorNeutralLevel('5')).toBe('5');
    expect(normalizeEditorNeutralLevel(3)).toBe('3');
  });
});
