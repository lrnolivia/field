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

  it('restores vertical optical presence without bloating separators', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('h-[36px]');
    expect(toolbar).toContain('px-2 py-2 gap-0.5');
    expect(toolbar).toContain('h-[20px]');
    expect(toolbar).toContain('mx-0.5');
    expect(toolbar).not.toContain('h-[32px]');
  });

  it('keeps utility chips neutral while preserving active tool accent', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain("bg-[var(--control-bg)] hover:bg-[var(--control-bg-hover)]");
    expect(toolbar).toContain("bg-[var(--bg-active)] text-[var(--text-primary)]");
    expect(toolbar).toContain("bg-[var(--accent)] text-[var(--accent-fg)]");
    expect(toolbar).not.toContain("hover:[--cut-border-color:var(--border-focus)]");
  });

  it('keeps compact rounded local dropdowns', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('rounded-[8px]');
    expect(toolbar).toContain('shadow-[var(--shadow-lg)] p-1');
    expect(toolbar).toContain('rounded-[5px]');
  });
});
