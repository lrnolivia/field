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

  it('keeps Inspector as the source of truth instead of remapping its native chrome', () => {
    const css = read('src/styles/field-chrome.css');
    expect(css).not.toContain('[data-properties-panel]');
    expect(css).not.toContain('[data-field-floating-surface]');
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
    expect(theme).toContain('dataset.interfaceContrast');
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

  it('keeps every current left-panel route inside the shared chrome scope', () => {
    const css = read('src/styles/field-chrome.css');
    for (const surface of [
      'insert',
      'pages-layers',
      'layers',
      'library',
      'presets',
      'media',
      'locale',
      'cms',
      'branches',
      'vibe',
    ]) {
      expect(css).toContain(`data-left-panel-surface="${surface}"`);
    }
  });

  it('marks left-owned shared primitives without retheming generic portaled UI', () => {
    expect(read('src/design-system/SectionLabel.tsx')).toContain('data-field-chrome-section-label');
    expect(read('src/design-system/SearchBar.tsx')).toContain('data-field-chrome-search');
    expect(read('src/design-system/SidebarRow.tsx')).toContain('data-field-chrome-row');
    expect(read('src/design-system/SidebarRow.tsx')).toContain('data-active={isActive');
    expect(read('src/editor/ui/SearchableDropdown.tsx')).not.toContain('data-field-chrome-combobox-trigger');
    expect(read('src/design-system/Modal.tsx')).not.toContain('data-field-chrome-surface="modal"');
    expect(read('src/editor/left-toolbar/panels/insert/index.tsx')).toContain('data-field-insert-secondary');
  });
  it('audits every left-origin route without inventing a standalone Plugins panel', () => {
    const panel = read('src/editor/left-toolbar/LeftPanel.tsx');
    for (const id of ['insert', "'pages-layers'", 'layers', 'library', 'presets', 'media', 'locale', 'cms', 'branches']) {
      expect(panel).toContain(id);
    }
    expect(panel).not.toContain("plugins: Plugins");
    expect(read('src/editor/left-toolbar/panels/LibraryPanel/index.tsx')).toContain('<PluginsSection');
    expect(read('src/editor/VibeDockShell.tsx')).toContain('data-left-panel-surface="vibe"');
    expect(read('src/editor/AIChatSheet.tsx')).toContain('data-vibe-detached');
    expect(read('src/editor/ToolbarPanelHost.tsx')).toContain('data-toolbar-panel={panel.kind}');
  });


});
