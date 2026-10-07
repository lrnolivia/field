// FIGUI3_BOTTOM_TOOLBAR_POLISH_TEST_20260927
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 bottom toolbar optical parity', () => {
  it('uses true-float rounded geometry instead of inherited cut corners', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('FIGUI3_BOTTOM_TOOLBAR_POLISH_20260925');
    expect(toolbar).toContain('rounded-[inherit]');
    expect(toolbar).toContain('var(--field-selection-shell-radius, 11px)');
    expect(toolbar).not.toContain('cut-corners');
    expect(toolbar).not.toContain('cut-border');
  });

  it('gives split chevrons a real adjacent Figma-like hit surface', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('w-[20px] h-[36px] rounded-[6px]');
    expect(toolbar).toContain('bg-[var(--bg-hover)]');
    expect(toolbar).toContain('gap-px');
  });

  it('marks the active menu item accessibly and keeps a dedicated glyph column', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain("aria-current={active ? 'true' : undefined}");
    expect(toolbar).toContain('data-field-toolbar-glyph="menu"');
    expect(toolbar).toContain('{icon ?? null}');
    expect(toolbar).toContain('className={TOOLBAR_MENU_SURFACE}');
    expect(read('src/editor/media/toolbar-menu-chrome.ts')).toContain('rounded-[11px]');
  });
});
