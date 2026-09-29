import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Inspector cards and spacing contract', () => {
  it('renders every ToolSection category through the shared compact card grammar', () => {
    const section = read('src/editor/controls/ToolSection.tsx');
    const divider = read('src/editor/controls/ToolDivider.tsx');
    const scale = read('src/editor/tools/ScaleTool.tsx');
    expect(section).toContain('data-inspector-section-card');
    expect(section).toContain('data-inspector-section-kind={sectionVisualKind(title)}');
    expect(section).toContain('data-inspector-section-glyph');
    expect(section).toContain('rounded-[10px]');
    expect(divider).toContain('h-1 bg-transparent');
    expect(scale).toContain('data-inspector-section-card');
  });

  it('keeps canonical peer editing cells on the 8px inspector rhythm', () => {
    const theme = read('src/styles/loew-theme.css');
    const padding = read('src/editor/tools/LayoutPaddingControl.tsx');
    const size = read('src/editor/tools/SizeTool.tsx');
    const options = read('src/editor/ui/OptionsPanel.tsx');
    const scale = read('src/editor/tools/ScaleTool.tsx');
    expect(theme).toContain('--inspector-grid-gap: 8px');
    expect(theme).toContain('[data-inspector-peer-row]');
    expect(padding).toContain('data-layout-padding-axes className="grid grid-cols-2 gap-2"');
    expect(padding).toContain('data-layout-padding-sides className="grid grid-cols-4 gap-2"');
    expect(size).toContain('data-inspector-peer-row className="flex items-center gap-2 w-full min-w-0"');
    expect(options).toContain('data-inspector-peer-row className="grid min-w-0 grid-cols-2 gap-2"');
    expect(scale).toContain('grid grid-cols-2 gap-2');
  });

  it('marks compound peer rows instead of leaving legacy 4px gutters', () => {
    const files = [
      'src/editor/tools/AnimationTool/motion/MotionPropsEditor.tsx',
      'src/editor/tools/CursorTool.tsx',
      'src/editor/tools/LayoutTool.tsx',
      'src/editor/tools/PageEffectTool/MaskEditor.tsx',
      'src/editor/tools/PageEffectTool/SideEditor.tsx',
      'src/editor/tools/StylesTool/atoms/OffsetControl.tsx',
      'src/editor/tools/StylesTool/atoms/Rotate3DControl.tsx',
      'src/editor/tools/StylesTool/atoms/ScaleXYControl.tsx',
      'src/editor/tools/StylesTool/atoms/SkewControl.tsx',
      'src/editor/tools/StylesTool/atoms/TransformControl.tsx',
      'src/editor/tools/TextStyleTool/atoms/TextPropertyControl.tsx',
      'src/editor/tools/CollectionList/FilterControl.tsx',
    ];
    for (const file of files) expect(read(file), file).toContain('data-inspector-peer-row');
  });

  it('cards selected-item categories that historically bypassed ToolSection', () => {
    const selection = read('src/editor/tools/SelectionTool.tsx');
    const component = read('src/editor/tools/ComponentPropsTool.tsx');
    expect(selection).toContain('<ToolSection');
    expect(selection).toContain('title="Selection colors"');
    expect(selection).toContain('data-selection-colors-preview');
    expect(selection).not.toContain('aria-expanded={expanded}');
    expect(component).toContain('data-inspector-section-card');
    expect(component).toContain('data-inspector-section="component"');
    expect(component).toContain('data-inspector-section-kind="content"');
    expect(component).not.toContain("var(--accent-secondary, #a855f7)");
  });

  it('keeps spatial and picker micro-grids intentionally compact', () => {
    expect(read('src/editor/tools/LayoutTool.tsx')).toContain('field-alignment-matrix grid grid-cols-3 grid-rows-3 gap-0.5');
    expect(read('src/editor/tools/PositionTool/PinControl.tsx')).toContain('grid grid-cols-3 grid-rows-3 gap-2');
    expect(read('src/editor/tools/CursorTool/cursor-picker-grid.tsx')).toContain('grid grid-cols-4 gap-1.5');
  });
});
