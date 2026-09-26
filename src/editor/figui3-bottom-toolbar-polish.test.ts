// FIGUI3_BOTTOM_TOOLBAR_POLISH_TEST_20260925
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 bottom toolbar optical parity', () => {
  it('uses true-float rounded geometry instead of inherited cut corners', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('FIGUI3_BOTTOM_TOOLBAR_POLISH_20260925');
    expect(toolbar).toContain('rounded-[11px]');
    expect(toolbar).not.toContain('cut-corners');
    expect(toolbar).not.toContain('cut-border');
    expect(toolbar).not.toContain('--cut-border-color');
  });

  it('keeps full-size authoring controls while utilities are denser', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain("'w-[32px] h-[32px]' : 'w-[36px] h-[36px]'");
    expect(toolbar).toContain('px-2 py-2 gap-0.5');
    expect(toolbar).toContain('h-[20px]');
    expect(toolbar).toContain('mx-0.5');
  });

  it('preserves sparse functional accent and neutral utility chrome', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain("bg-[var(--accent)] text-[var(--accent-fg)]");
    expect(toolbar).toContain('data-toolbar-tool="smart-zoom"');
    expect(toolbar).toContain('hover:bg-[var(--control-bg-hover)]');
    expect(toolbar).not.toContain('LocaleDropdown');
    expect(toolbar).not.toContain('ThemeSwitcher');
  });

  it('keeps compact rounded local command menus', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('rounded-[8px]');
    expect(toolbar).toContain('shadow-[var(--shadow-lg)] p-1');
    expect(toolbar).toContain('rounded-[5px]');
  });
});
