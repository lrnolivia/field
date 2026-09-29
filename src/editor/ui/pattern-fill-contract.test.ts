import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fill = readFileSync(new URL('../tools/StylesTool/atoms/FillControl.tsx', import.meta.url), 'utf8');
const parser = readFileSync(new URL('../../code/parsing/parser.ts', import.meta.url), 'utf8');

describe('Pattern Fill source contract', () => {
  it('exposes Pattern as a real Fill type using existing field controls', () => {
    expect(fill).toContain("type FillTab = 'color' | 'gradient' | 'pattern' | 'image' | 'video'");
    expect(fill).toContain("title: 'Pattern'");
    expect(fill).toContain('<PatternFillTab');
    expect(fill).toContain('<ToolSelect');
    expect(fill).toContain('<ColorInput');
    expect(fill).toContain('<ToolInput');
  });

  it('preserves semantic identity in source instead of reverse engineering CSS', () => {
    expect(fill).toContain("'data-field-pattern'");
    expect(parser).toContain("'data-field-pattern'");
  });
});
