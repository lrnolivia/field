import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('shared field chrome architecture', () => {
  it('loads one canonical chrome stylesheet after the base theme', () => {
    const main = read('src/main.tsx');
    const theme = main.indexOf("./styles/loew-theme.css");
    const chrome = main.indexOf("./styles/field-chrome.css");
    expect(theme).toBeGreaterThan(-1);
    expect(chrome).toBeGreaterThan(theme);
  });

  it('shares the chrome variable boundary between Inspector and left panels', () => {
    const css = read('src/styles/field-chrome.css');
    expect(css).toContain('[data-properties-panel]');
    expect(css).toContain('[data-editor-panel="left-primary"]');
    expect(css).toContain('--field-chrome-section-bg');
    expect(css).toContain('--field-chrome-border');
  });

  it('keeps interface contrast as an editor-only persisted preference', () => {
    const prefs = read('src/code/stores/user-preferences-store.ts');
    const theme = read('src/editor/builder-theme.ts');
    expect(prefs).toContain('field:prefs:interfaceContrast');
    expect(theme).toContain('interfaceContrastAtom');
    expect(theme).toContain('--field-chrome-section-mix');
    expect(theme).toContain('data.interfaceContrast');
  });

  it('marks the entire left content panel as one chrome scope', () => {
    const panel = read('src/editor/left-toolbar/LeftPanel.tsx');
    expect(panel).toContain('data-field-chrome-panel');
    expect(panel).toContain('data-left-panel-surface={activePanel}');
  });

  it('exposes the contrast slider from the existing Appearance popover', () => {
    const popover = read('src/editor/ui/ThemeNeutralPopover.tsx');
    expect(popover).toContain('data-interface-contrast-control');
    expect(popover).toContain('Interface contrast');
  });
});
