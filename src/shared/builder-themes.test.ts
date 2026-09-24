import { describe, test, expect } from 'vitest';
import {
  BUILDER_THEMES,
  DEFAULT_BUILDER_THEME_ID,
  DARK_ACCENT_TEXT_MIX,
  getBuilderThemeById,
  normalizeBuilderThemeId,
} from './builder-themes';

describe('builder themes', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) =>
        v <= 0.03928
          ? v / 12.92
          : ((v + 0.055) / 1.055) ** 2.4,
      );

    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };

  const ratio = (a: string, b: string) => {
    const [l1, l2] = [lum(a), lum(b)];

    return (
      (Math.max(l1, l2) + 0.05) /
      (Math.min(l1, l2) + 0.05)
    );
  };

  test('ships the canonical field accent catalog', () => {
    expect(BUILDER_THEMES.map((t) => t.id)).toEqual([
      'monochrome',
      'teal',
      'sienna',
      'gold',
    ]);

    expect(BUILDER_THEMES[0].id)
      .toBe(DEFAULT_BUILDER_THEME_ID);
  });

  test('pins the canonical field accent hues', () => {
    expect(getBuilderThemeById('monochrome')!.light.accent)
      .toBe('#686868');

    expect(getBuilderThemeById('teal')!.light.accent)
      .toBe('#1c8c93');

    expect(getBuilderThemeById('sienna')!.light.accent)
      .toBe('#b5471f');

    expect(getBuilderThemeById('gold')!.light.accent)
      .toBe('#edb713');
  });

  test('field identity foregrounds stay pinned to the canonical palette', () => {
    const expected = {
      monochrome: '#f6f6f6',
      teal: '#e0ffef',
      sienna: '#f9dcbd',
      gold: '#fffbe1',
    };

    for (const t of BUILDER_THEMES) {
      for (const mode of ['light', 'dark'] as const) {
        expect(t[mode].accentFg, `${t.id} (${mode})`)
          .toBe(expected[t.id as keyof typeof expected]);
      }
    }
  });

  test('normal-size text foregrounds clear WCAG AA on accent fills', () => {
    for (const t of BUILDER_THEMES) {
      for (const mode of ['light', 'dark'] as const) {
        const { accent, accentTextFg } = t[mode];

        expect(
          ratio(accent, accentTextFg),
          `${t.id} (${mode})`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test('dark-mode lifted accent text remains legible', () => {
    const mixWithWhite = (
      hex: string,
      accentShare: number,
    ) => {
      const ch = [1, 3, 5].map((i) =>
        Math.round(
          parseInt(hex.slice(i, i + 2), 16) * accentShare +
          255 * (1 - accentShare),
        ),
      );

      return `#${ch
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`;
    };

    const dropdown = '#2a2a2a';

    for (const t of BUILDER_THEMES) {
      const lifted = mixWithWhite(
        t.dark.accent,
        DARK_ACCENT_TEXT_MIX,
      );

      expect(
        ratio(lifted, dropdown),
        t.id,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('every field accent keeps one hue across modes', () => {
    for (const t of BUILDER_THEMES) {
      expect(t.light.accent, t.id)
        .toBe(t.dark.accent);

      expect(t.light.accentFg, t.id)
        .toBe(t.dark.accentFg);
    }
  });

  test('legacy stored ids migrate cleanly', () => {
    expect(normalizeBuilderThemeId('graphite'))
      .toBe('monochrome');

    expect(normalizeBuilderThemeId('amber'))
      .toBe('gold');

    expect(getBuilderThemeById('graphite')?.id)
      .toBe('monochrome');

    expect(getBuilderThemeById('amber')?.id)
      .toBe('gold');
  });

  test('ids are unique and use plain hex values', () => {
    expect(
      new Set(BUILDER_THEMES.map((t) => t.id)).size,
    ).toBe(BUILDER_THEMES.length);

    for (const t of BUILDER_THEMES) {
      for (const mode of ['light', 'dark'] as const) {
        expect(t[mode].accent)
          .toMatch(/^#[0-9a-f]{6}$/i);

        expect(t[mode].accentFg)
          .toMatch(/^#[0-9a-f]{6}$/i);

        expect(t[mode].accentTextFg)
          .toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  test('unknown stored ids remain unknown', () => {
    expect(getBuilderThemeById('default'))
      .toBeUndefined();

    expect(getBuilderThemeById('rose'))
      .toBeUndefined();
  });
});
