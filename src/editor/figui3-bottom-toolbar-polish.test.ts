// FIGUI3_BOTTOM_TOOLBAR_POLISH_TEST_20260927
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
  });

  it('gives split chevrons a real adjacent Figma-like hit surface', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('w-[20px] h-[36px] rounded-[6px]');
    expect(toolbar).toContain('bg-[var(--bg-hover)]');
    expect(toolbar).toContain('gap-px');
  });

  it('keeps menu checks and tool icons in separate columns', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('{active ? <CheckSvg /> : null}');
    expect(toolbar).toContain('{icon ?? null}');
    expect(toolbar).toContain('min-w-[200px] rounded-[10px]');
  });
});
