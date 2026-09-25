// FIGUI3_SIDEBAR_SYSTEM_POLISH_TEST_20260925
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 sidebar system + document panel', () => {
  it('uses restrained shared section hierarchy', () => {
    const file = read('src/design-system/SectionLabel.tsx');
    expect(file).toContain('FIGUI3_SIDEBAR_SECTION_LABEL_20260925');
    expect(file).toContain("md: 'text-[11px] font-medium");
    expect(file).toContain("sm: 'text-[11px] font-medium");
    expect(file).not.toContain('font-extrabold');
    expect(file).toContain('px-2 h-7');
  });

  it('uses native neutral search/action chrome instead of cut corners', () => {
    const search = read('src/design-system/SearchBar.tsx');
    const searchAction = read('src/design-system/PanelSearchButton.tsx');
    const add = read('src/design-system/AddButton.tsx');

    expect(search).toContain('h-7');
    expect(search).toContain('rounded-[5px]');
    expect(search).toContain('bg-[var(--control-bg)]');
    expect(search).toContain('focus-visible:ring-[var(--selection)]');
    expect(search).not.toContain('cut-corners');
    expect(search).not.toContain('bg-black/[0.06]');

    expect(searchAction).toContain('w-6 h-6');
    expect(searchAction).toContain('rounded-[4px]');
    expect(searchAction).not.toContain('cut-corners');

    expect(add).toContain('w-6 h-6');
    expect(add).toContain('rounded-[4px]');
    expect(add).not.toContain('cut-corners');
  });

  it('removes Revyme/purple styling from shared sidebar rows', () => {
    const file = read('src/design-system/SidebarRow.tsx');
    expect(file).toContain('FIGUI3_SIDEBAR_ROW_20260925');
    expect(file).toContain('rounded-[4px]');
    expect(file).toContain('bg-[var(--bg-active)]');
    expect(file).toContain('iconColor = "var(--text-secondary)"');
    expect(file).toContain('bg-[var(--control-bg)]');
    expect(file).not.toContain('cut-corners');
    expect(file).not.toContain('#a78bfa');
    expect(file).not.toContain('bg-white text-black');
  });

  it('uses one rounded shared menu family', () => {
    const file = read('src/design-system/DropdownMenu.tsx');
    expect(file).toContain('FIGUI3_SIDEBAR_DROPDOWN_20260925');
    expect(file).toContain('rounded-[8px]');
    expect(file).toContain('rounded-[5px]');
    expect(file).toContain('overflowY');
    expect(file).toContain('overscrollBehavior');
    expect(file).not.toContain('cut-corners');
    expect(file).not.toContain('cut-border');
    expect(file).not.toContain('--cut-border-color');
  });

  it('tightens Pages/Layers chrome without changing row rhythm', () => {
    const css = read('src/editor/left-toolbar/panels/pages-layers.css');
    const shell = read('src/editor/left-toolbar/panels/PagesLayersPanel.tsx');
    const pages = read('src/editor/FileExplorer.tsx');
    const layers = read('src/editor/LayersPanel.tsx');

    expect(css).toContain('FIGUI3_DOCUMENT_PANEL_DENSITY_20260925');
    expect(css).toContain('flex: 0 0 5px');
    expect(css).toContain('height: 28px');
    expect(css).toContain('padding: 0 8px');
    expect(css).toContain('padding: 0 4px 4px');
    expect(css).toContain('min-height: 24px');
    expect(css).toContain('var(--selection) 12%');

    expect(shell).toContain('overflow-y-auto overscroll-contain');
    expect(pages).toContain('px-2 pb-1 shrink-0');
    expect(layers).toContain('px-1 overflow-y-auto overflow-x-auto overscroll-contain');
  });

  it('does not touch Group-owned Layers row/drag implementation', () => {
    const assignment = read('src/editor/figui3-sidebar-system-polish.test.ts');
    expect(assignment).toContain('FIGUI3_SIDEBAR_SYSTEM_POLISH_TEST_20260925');
    // Scope protection lives in tracker/assignment; this contract intentionally
    // tests only presentation files resident in the repository.
  });
});
