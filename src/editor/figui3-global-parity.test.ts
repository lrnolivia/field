// FIGUI3_CORRECTIVE_GLOBAL_TEST_20260925
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 global parity contract', () => {
  it('uses the global parity token layer and keeps the current theme as the middle of five levels', () => {
    const css = read('src/styles/loew-theme.css');
    expect(css).toContain('FIGUI3_GLOBAL_PARITY_20260925');
    expect(css).toContain('--control-height: 24px');
    expect(css).toContain('data-neutral-level="1"');
    for (const level of ['1', '2', '4', '5']) expect(css).toContain(`data-neutral-level="${level}"`);
    expect(read('src/shared/editor-neutral-theme.ts')).toContain("DEFAULT_EDITOR_NEUTRAL_LEVEL: EditorNeutralLevel = '3'");
    expect(css).toContain('--selection: #0d99ff');
  });

  it('keeps neutral mode/level separate from builder accent and exposes the theme picker', () => {
    const prefs = read('src/code/stores/user-preferences-store.ts');
    const settings = read('src/editor/overlays/SettingsOverlay.tsx');
    const theme = read('src/editor/builder-theme.ts');
    expect(prefs).toContain('editorThemeModeAtom');
    expect(prefs).toContain('editorNeutralLevelAtom');
    expect(settings).toContain("(['1', '2', '3', '4', '5'] as EditorNeutralLevel[]).map");
    expect(settings).toContain('setEditorNeutralLevel');
    expect(theme).toContain('dataset.neutralLevel');
    expect(theme).toContain('dataset.themeMode');
  });

  it('renders a real Page inspector for no selection and stores appearance in project metadata', () => {
    const panel = read('src/editor/PropertiesPanel.tsx');
    const store = read('src/code/stores/page-appearance-store.ts');
    const config = read('src/code/project/page-appearance-config.ts');
    const canvas = read('src/canvas/Canvas.tsx');
    expect(panel).toContain('{isPageContext ? <PageSettingsTool /> : null}');
    expect(read('src/editor/tools/PageSettingsTool.tsx')).toContain('<PageAppearanceTool />');
    expect(config).toContain("_meta/page-appearance.json");
    expect(store).toContain('projectFS.writeFile');
    expect(canvas).toContain("backgroundColor: 'var(--page-canvas-background, var(--bg-canvas))'");
  });

  it('tightens the font picker and generic popup instead of shrinking text further', () => {
    const fonts = read('src/editor/ui/FontFamilyPopup.tsx');
    const popup = read('src/editor/ui/ToolPopup.tsx');
    expect(fonts).toContain('rowHeight={28}');
    expect(fonts).toContain('title="Fonts"');
    expect(fonts).toContain('width={276}');
    expect(popup).toContain('gap-1.5');
  });
});
