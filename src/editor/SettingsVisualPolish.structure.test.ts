import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');
const shared = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/settings-shared.tsx'), 'utf8');
const page = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/tools/PageSettingsTool.tsx'), 'utf8');
const appearance = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/tools/PageAppearanceTool.tsx'), 'utf8');

describe('settings visual hierarchy', () => {
  it('uses the full General canvas for real editor preferences', () => {
    expect(settings).toContain("max-w-[920px]");
    expect(settings).toContain('data-general-appearance-preview');
    expect(settings).toContain('data-general-theme-display');
    expect(settings).toContain('aspect-[16/10]');
    expect(settings).toContain('data-general-settings-summary');
    expect(settings).toContain("activeSection === 'appearance'");
    expect(settings).toContain("activeSection === 'workspace'");
    expect(settings).toContain("activeSection === 'canvas'");
    expect(settings).toContain('data-general-settings-overview');
    expect(settings).toContain('SettingsGroup surface title="Appearance"');
    expect(settings).toContain('SettingsGroup surface title="Workspace"');
    expect(settings).toContain('SettingsGroup surface title="Canvas"');
    expect(settings).toContain('builderThemeAtom');
    expect(settings).toContain('editorThemeModeAtom');
    expect(settings).toContain('editorNeutralLevelAtom');
    expect(settings).toContain('websitePreviewThemeAtom');
    expect(settings).toContain('workspaceAutoHideAtom');
    expect(settings).toContain('rightInspectorAutoHideAtom');
    expect(settings).toContain('leftContentWidthAtom');
    expect(settings).toContain('rightPaneWidthAtom');
    expect(shared).toContain('surface = false');
    expect(shared).toContain('cut-corners cut-lg cut-border');
  });

  it('keeps project-scoped controls out of field General', () => {
    const start = settings.indexOf("if (activeSection === 'website')");
    const end = settings.indexOf('// Look up registered section', start);
    const block = settings.slice(start, end);
    expect(block).not.toContain('Site metadata');
    expect(block).not.toContain('Custom code');
    expect(block).not.toContain('Default theme');
    expect(block).toContain('Case management');
    expect(block).toContain('Website preview');
  });

  it('gives Page Settings a page context header and stacked metadata fields', () => {
    expect(page).toContain('data-page-settings-header');
    expect(page).toContain('data-page-settings-field');
    expect(page).toContain('data-page-settings-preview');
    expect(page).toContain('data-page-search-preview');
    expect(page).toContain('data-page-social-preview');
    expect(page).toContain('aspect-[16/10]');
    expect(page).toContain('Search preview');
    expect(page).toContain('Open Graph');
    expect(page).toContain('X / Twitter');
    expect(appearance).toContain('<ToolSection title="Canvas">');
  });
});
