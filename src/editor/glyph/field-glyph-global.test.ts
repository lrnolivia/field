import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const main = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../styles/field-glyph-global.css', import.meta.url), 'utf8');

describe('field.GLYPH universal app-shell fallback', () => {
  it('marks only the main app document and loads the universal fallback', () => {
    expect(main).toContain("import './styles/field-glyph-global.css';");
    expect(main).toContain("document.documentElement.dataset.fieldGlyphMotion = 'true'");
  });

  it('covers interactive app-shell SVGs while preserving explicit semantic motion', () => {
    expect(css).toContain("html[data-field-glyph-motion='true']");
    expect(css).toContain("button:not(:disabled)");
    expect(css).toContain("[role='button']");
    expect(css).toContain("a[href]");
    expect(css).toContain('[data-field-glyph] svg');
    expect(css).toContain('[data-field-glyph-morph] svg');
    expect(css).toContain('[data-field-toolbar-glyph] svg');
  });

  it('stays compositor-cheap at rest', () => {
    expect(css).not.toContain('will-change');
    expect(css).not.toContain('requestAnimationFrame');
    expect(css).not.toContain('filter:');
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});
