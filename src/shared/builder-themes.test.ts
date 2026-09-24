import { describe, test, expect } from 'vitest';
import {
  BUILDER_THEMES,
  DEFAULT_BUILDER_THEME_ID,
  DARK_ACCENT_TEXT_MIX,
  getBuilderThemeById,
} from './builder-themes';

describe('builder themes', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };

  const ratio = (a: string, b: string) => {
    const [l1, l2] = [lum(a), lum(b)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  test('ships only the Figma-first accent catalog, Graphite first', () => {
    expect(BUILDER_THEMES.map((t) => t.id)).toEqual([
      'graphite', 'teal', 'sienna', 'amber',
    ]);
    expect(BUILDER_THEMES[0].id).toBe(DEFAULT_BUILDER_THEME_ID);
  });

  test('every label clears WCAG AA on its accent fill', () => {
    for (const t of BUILDER_THEMES) {
      for (const mode of ['light', 'dark'] as const) {
        const { accent, accentFg } = t[mode];
        expect(ratio(accent, accentFg), `${t.id} (${mode})`)
          .toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test('dark-mode lifted accent text remains legible on dark chrome', () => {
    const mixWithWhite = (hex: string, accentShare: number) => {
      const ch = [1, 3, 5].map((i) =>
        Math.round(parseInt(hex.slice(i, i + 2), 16) * accentShare + 255 * (1 - accentShare)),
      );
      return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    };

    const dropdown = '#2b2b2b';
    for (const t of BUILDER_THEMES) {
      if (t.id === DEFAULT_BUILDER_THEME_ID) continue;
      const lifted = mixWithWhite(t.dark.accent, DARK_ACCENT_TEXT_MIX);
      expect(ratio(lifted, dropdown), t.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('Graphite intentionally inverts between light and dark', () => {
    const g = getBuilderThemeById('graphite')!;
    expect(g.light.accent).toBe('#2c2c2c');
    expect(g.light.accentFg).toBe('#ffffff');
    expect(g.dark.accent).toBe('#f0f0f0');
    expect(g.dark.accentFg).toBe('#111111');
  });

  test('Terra accents keep one hue across modes', () => {
    for (const t of BUILDER_THEMES.filter((x) => x.id !== 'graphite')) {
      expect(t.light.accent, t.id).toBe(t.dark.accent);
      expect(t.light.accentFg, t.id).toBe(t.dark.accentFg);
    }
  });

  test('ids are unique and plain hex values are used', () => {
    expect(new Set(BUILDER_THEMES.map((t) => t.id)).size).toBe(BUILDER_THEMES.length);
    for (const t of BUILDER_THEMES) {
      for (const mode of ['light', 'dark'] as const) {
        expect(t[mode].accent).toMatch(/^#[0-9a-f]{6}$/i);
        expect(t[mode].accentFg).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  test('unknown/stale stored ids fall back through caller logic', () => {
    expect(getBuilderThemeById('default')).toBeUndefined();
    expect(getBuilderThemeById('rose')).toBeUndefined();
  });
});
