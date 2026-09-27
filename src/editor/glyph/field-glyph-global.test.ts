import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const main = readFileSync(path.join(process.cwd(), 'src/main.tsx'), 'utf8');
const css = readFileSync(path.join(process.cwd(), 'src/styles/field-glyph-global.css'), 'utf8');
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');

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
    expect(cssRules).not.toMatch(/will-change\s*:/);
    expect(cssRules).not.toContain('requestAnimationFrame');
    expect(cssRules).not.toMatch(/(?:^|[;{}])\s*filter\s*:/m);
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});
