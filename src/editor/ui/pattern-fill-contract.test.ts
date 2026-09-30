import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fill = readFileSync(resolve(process.cwd(), 'src/editor/tools/StylesTool/atoms/FillControl.tsx'), 'utf8');
const shell = readFileSync(resolve(process.cwd(), 'src/editor/ui/PaintPickerShell.tsx'), 'utf8');
const parser = readFileSync(resolve(process.cwd(), 'src/code/parsing/parser.ts'), 'utf8');
const library = readFileSync(resolve(process.cwd(), 'src/editor/ui/PatternLibraryPanel.tsx'), 'utf8');

describe('Pattern Fill source contract', () => {
  it('exposes Pattern as a real Fill type using existing field controls', () => {
    expect(fill).toContain("type FillTab = 'color' | 'gradient' | 'pattern' | 'image' | 'video' | 'shader'");
    expect(shell).toContain("pattern: 'Pattern'");
    expect(fill).toContain('<PaintPickerShell');
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
    expect(fill).toContain('aria-label="Select pattern source"');
    expect(fill).toContain('onClick={openPatternMedia}');
  });

});
