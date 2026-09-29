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
    expect(stroke).toContain('grid-cols-[72px_minmax(0,1fr)_28px] gap-2');
    expect(stroke).toContain('chevronLabel="px"');
    expect(stroke).toContain('ariaLabel="Stroke style"');
  });

  it('uses the canonical effect row for regular, filter, backdrop, and text effects', () => {
    const shadow = read('src/editor/tools/StylesTool/atoms/ShadowControl.tsx');
    const filter = read('src/editor/tools/StylesTool/atoms/FilterControl.tsx');
    const backdrop = read('src/editor/tools/StylesTool/atoms/BackdropFilterControl.tsx');
    const textShadow = read('src/editor/tools/TextStyleTool/atoms/ShadowControl.tsx');
    for (const source of [shadow, filter, backdrop, textShadow]) expect(source).toContain('<EffectRow');
    expect(shadow).toContain('data-effect-editor');
    expect(textShadow).toContain('data-text-effect-editor');
    expect(filter).toContain('<OptionSection title="Layer blur">');
    expect(filter).toContain('<OptionSection title="Adjustments" divided>');
    expect(filter).toContain('<OptionSection title="Color" divided>');
    expect(filter).toContain('ScalarRow label="Radius"');
    expect(filter).not.toContain('<OptionSection title="Filter">');
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

  it('uses one inspector-wide 8px rhythm for peer cells and row spacing', () => {
    const theme = read('src/styles/loew-theme.css');
    const size = read('src/editor/tools/SizeTool.tsx');
    const padding = read('src/editor/tools/LayoutPaddingControl.tsx');

    expect(theme).toContain('--inspector-grid-gap: 8px');
    expect(theme).toContain('[data-properties-panel] [data-inspector-section-content]');
    expect(theme).toContain('[data-properties-panel] [data-tool-row-value]');
    expect(theme).toContain('[data-properties-panel] [data-layout-padding-axes]');
    expect(theme).toContain('[data-properties-panel] [data-layout-padding-sides]');
    expect(theme).toContain('[data-properties-panel] [data-spacing-axis-pair]');
    expect(theme).toContain('gap: var(--inspector-grid-gap, var(--control-gap, 8px))');

    expect(size).toContain('data-layout-size-pair className="field-inspector-field-grid"');
    expect(size).not.toContain('data-layout-size-pair className="field-inspector-field-grid" style={{ gap: 8 }}');
    expect(padding).toContain('data-layout-padding-toolbar');
    expect(padding).toContain('data-layout-padding-editor');
    expect(padding).toContain('className="flex flex-col gap-2 w-full"');
    expect(padding).toContain('data-layout-padding-axes');
    expect(padding).toContain('data-layout-padding-sides');
    expect(theme).not.toContain('[data-properties-panel] [data-layout-padding] > div:last-child');
  });

  it('keeps Appearance peer controls on the canonical inspector pair gutter', () => {
    const stylesTool = read('src/editor/tools/StylesTool/index.tsx');
    expect(stylesTool).toContain('data-appearance-core-row className="field-inspector-pair"');
    expect(stylesTool).not.toContain('data-appearance-core-row className="grid grid-cols-2 gap-1"');
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
