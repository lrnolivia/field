import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fill = readFileSync(new URL('../tools/StylesTool/atoms/FillControl.tsx', import.meta.url), 'utf8');
const parser = readFileSync(new URL('../../code/parsing/parser.ts', import.meta.url), 'utf8');
const library = readFileSync(new URL('./PatternLibraryPanel.tsx', import.meta.url), 'utf8');

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

  it('lazy-loads the large open-source catalog only when the Pattern library is mounted', () => {
    expect(library).toContain("import('./patterns/pattern-monster-catalog')");
    expect(fill).not.toContain("from '@/editor/ui/patterns/pattern-monster-catalog'");
  });

  it('credits the upstream MIT catalog in the visible library UI', () => {
    expect(library).toContain('Pattern Monster source and MIT license');
    expect(library).toContain('provenance.name');
    expect(library).toContain('provenance.license');
  });
  it('reuses the canonical Media picker for custom SVG/image tiles', () => {
    expect(fill).toContain('data-contextual-media-picker="fill-pattern"');
    expect(fill).toContain('<ImageSearchModal');
    expect(fill).toContain('defaultAssetPatternFill(url)');
    expect(fill).toContain('Choose Media tile…');
  });

});
