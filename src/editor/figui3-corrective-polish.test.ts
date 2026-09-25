// FIGUI3_CORRECTIVE_POLISH_TEST_20260925
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 corrective visual polish', () => {
  it('makes Inspector controls fill-led instead of outline-led', () => {
    const css = read('src/styles/loew-theme.css');
    const transparentBorders = css.match(/--control-border: transparent;/g) ?? [];
    const transparentHoverBorders = css.match(/--control-border-hover: transparent;/g) ?? [];
    expect(transparentBorders.length).toBeGreaterThanOrEqual(6);
    expect(transparentHoverBorders.length).toBeGreaterThanOrEqual(6);
    expect(css).toContain('--border-focus: var(--selection)');
    expect(css).toContain('FIGUI3_CORRECTIVE_DESTROKE_20260925');
  });

  it('removes ruled-cell and raised-thumb chrome from grouped Inspector controls', () => {
    const iconGroup = read('src/editor/controls/InspectorIconButtonGroup.tsx');
    const segmented = read('src/editor/controls/ToolSegmentedControl.tsx');
    expect(iconGroup).not.toContain('border-l border-[var(--control-border)]');
    expect(iconGroup).not.toContain('border border-[var(--control-border)] bg-[var(--control-bg)]');
    expect(segmented).toContain('border border-transparent');
    expect(segmented).toContain("boxShadow: 'none'");
    expect(segmented).toContain("backgroundColor: 'var(--bg-active)'");
  });

  it('uses one field-native font family trigger instead of a native select', () => {
    const family = read('src/editor/tools/TextStyleTool/atoms/FontFamilyControl.tsx');
    expect(family).toContain('data-typography-font-family-trigger');
    expect(family).toContain('shouldRenderFontNameWithUiFace');
    expect(family).not.toContain('data-typography-font-family-select');
    expect(family).not.toContain('<select');
  });

  it('matches the requested font browser grammar', () => {
    const popup = read('src/editor/ui/FontFamilyPopup.tsx');
    expect(popup).toContain('data-font-filter-trigger');
    expect(popup).toContain('data-font-filter-menu');
    expect(popup).toContain('data-font-selected-check');
    expect(popup).toContain('rowHeight={28}');
    expect(popup).toContain('Workspace fonts');
    expect(popup).toContain('Google Fonts');
    expect(popup).toContain('shouldRenderFontNameWithUiFace');
    expect(popup).toContain('Material (?:Symbols|Icons)');
    expect(popup).not.toContain('>Aa</span>');
    expect(popup).not.toContain('ControlLabel label="Category"');
    expect(popup).not.toContain('<select');
    expect(popup).not.toContain("bg-[var(--accent)] text-[var(--accent-fg)]");
  });
});
