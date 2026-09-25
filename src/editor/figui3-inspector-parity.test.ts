import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 Inspector parity contract', () => {
  it('uses one canonical paint-row grammar with an explicitly reserved visibility slot', () => {
    const paintRow = read('src/editor/controls/PaintRow.tsx');
    expect(paintRow).toContain('data-inspector-paint-row');
    expect(paintRow).toContain('data-paint-visibility-slot');
    expect(paintRow).toContain('data-inspector-paint-compound');
    expect(paintRow).toContain('54px');
    expect(paintRow).toContain('_28px_28px');
  });


  it('uses one canonical applied-effect row with a reserved visibility slot', () => {
    const effectRow = read('src/editor/controls/EffectRow.tsx');
    expect(effectRow).toContain('data-inspector-effect-row');
    expect(effectRow).toContain('data-effect-visibility-slot');
    expect(effectRow).toContain('_28px_28px');
  });

  it('surfaces inline paint opacity for regular Fill and Stroke', () => {
    const fill = read('src/editor/tools/StylesTool/atoms/FillControl.tsx');
    const stroke = read('src/editor/tools/StylesTool/atoms/BorderControl.tsx');
    expect(fill).toContain('<PaintRow');
    expect(fill).toContain('serializePaintOpacity');
    expect(stroke).toContain('<PaintRow');
    expect(stroke).toContain('data-inspector-stroke-geometry');
  });

  it('uses the canonical effect row for regular, filter, backdrop, and text effects', () => {
    const shadow = read('src/editor/tools/StylesTool/atoms/ShadowControl.tsx');
    const filter = read('src/editor/tools/StylesTool/atoms/FilterControl.tsx');
    const backdrop = read('src/editor/tools/StylesTool/atoms/BackdropFilterControl.tsx');
    const textShadow = read('src/editor/tools/TextStyleTool/atoms/ShadowControl.tsx');
    for (const source of [shadow, filter, backdrop, textShadow]) expect(source).toContain('<EffectRow');
    expect(shadow).toContain('data-effect-editor');
    expect(textShadow).toContain('data-text-effect-editor');
  });

  it('uses native SVG paint-opacity attributes and exposes Effects', () => {
    const svg = read('src/editor/tools/SvgShapeTool.tsx');
    expect(svg).toContain("'fill-opacity'");
    expect(svg).toContain("'stroke-opacity'");
    expect(svg).toContain('opacityLabel="Fill opacity"');
    expect(svg).toContain('opacityLabel="Stroke opacity"');
    expect(svg).toContain('title="Effects"');
    expect(svg).toContain('drop-shadow(');
  });

  it('owns Auto layout padding directly instead of nesting the generic PaddingControl', () => {
    const layout = read('src/editor/tools/LayoutTool.tsx');
    expect(layout).toContain('data-auto-layout-padding');
    expect(layout).toContain('setPaddingAxis');
    expect(layout).not.toContain('<PaddingControl />');
  });

  it('keeps Typography Basics and Details aligned to the FigUI3 information hierarchy', () => {
    const typography = read('src/editor/tools/TextStyleTool/TypographyAdvancedPopover.tsx');
    for (const label of ['Basics', 'Details', 'Vertical trim', 'Paragraph spacing', 'Numbers', 'Position', 'Letterforms', 'Ordinals', 'Stylistic sets', 'Kerning', 'Horizontal spacing']) {
      expect(typography).toContain(label);
    }
    expect(typography).toContain('data-typography-preview');
    expect(typography).not.toContain('TextFillControl');
    expect(typography).not.toContain('ContentControl');
  });
});
