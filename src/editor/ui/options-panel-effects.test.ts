import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Options panel effect migration', () => {
  it('provides a Settings-inspired effect surface grammar without changing generic options panels', () => {
    const options = read('src/editor/ui/OptionsPanel.tsx');
    expect(options).toContain('data-effect-options-panel');
    expect(options).toContain('data-effect-option-section');
    expect(options).toContain('data-effect-option-action');
    expect(options).toContain('rounded-[8px] border border-[var(--border-light)]');
    expect(options).toContain('border-b border-[var(--border-light)]');
    expect(options).toContain('data-effect-live-preview');
    expect(options).toContain('InspectorSectionGlyph');
    expect(options).toContain('bg-[var(--bg-surface)]/45');
  });

  it('uses the shared effect surface for Shadow', () => {
    const shadow = read('src/editor/tools/StylesTool/atoms/ShadowControl.tsx');
    expect(shadow).toContain("{ kind: 'options', width: 300 }");
    expect(shadow).toContain('<EffectOptionsPanel>');
    expect(shadow).toContain('<ShadowLivePreview');
    for (const title of ['Style', 'Geometry', 'Paint']) expect(shadow).toContain(`<EffectOptionSection title="${title}"`);
    expect(shadow).toContain('<SpatialRow label="Offset">');
    expect(shadow).toContain('label="Blur"');
    expect(shadow).toContain('<PaintOptionRow');
  });

  it('uses the shared effect surface for Layer blur and filter adjustments', () => {
    const filter = read('src/editor/tools/StylesTool/atoms/FilterControl.tsx');
    expect(filter).toContain("{ kind: 'options', width: 300 }");
    expect(filter).toContain('<EffectOptionsPanel>');
    expect(filter).toContain('value={f.blur}');
    for (const title of ['Layer blur', 'Adjustments', 'Color']) expect(filter).toContain(`<EffectOptionSection title="${title}"`);
    for (const label of ['Radius', 'Brightness', 'Contrast', 'Saturate', 'Grayscale', 'Hue rotate']) {
      expect(filter).toContain(`label="${label}"`);
    }
  });

  it('uses the shared effect surface and header action for Background blur', () => {
    const backdrop = read('src/editor/tools/StylesTool/atoms/BackdropFilterControl.tsx');
    expect(backdrop).toContain("{ kind: 'options', width: 300 }");
    expect(backdrop).toContain('<EffectOptionsPanel>');
    expect(backdrop).toContain('title="Background blur"');
    expect(backdrop).toContain('<EffectOptionAction onClick={onReset}>Reset</EffectOptionAction>');
    expect(backdrop).toContain('label="Radius"');
  });

  it('migrates Text Shadow off its legacy field stack and onto the effect surface', () => {
    const textShadow = read('src/editor/tools/TextStyleTool/atoms/ShadowControl.tsx');
    expect(textShadow).toContain('data-text-effect-editor');
    expect(textShadow).toContain('<EffectOptionsPanel>');
    expect(textShadow).toContain('<EffectOptionSection title="Geometry"');
    expect(textShadow).toContain('<EffectOptionSection title="Paint"');
    expect(textShadow).toContain('<SpatialRow label="Offset">');
    expect(textShadow).toContain('<PaintOptionRow label="Color"');
    expect(textShadow).toContain('width={300} kind="options"');
    expect(textShadow).not.toContain('className="grid grid-cols-[var(--tool-label-col)_minmax(0,1fr)] items-center w-full"');
  });

  it('gives Fill the canonical options shell while preserving deep fill editors', () => {
    const fill = read('src/editor/tools/StylesTool/atoms/FillControl.tsx');
    expect(fill).toContain('ariaLabel="Paint picker"');
    expect(fill).toContain('width={304}');
    expect(fill).toContain('<ToolPopup');
    expect(fill).toContain('showNestedHeaderWhenHidden');
    expect(fill).toContain('<SingleModeFillContent');
    expect(fill).toContain('<MultiModeFillContent');
  });
});
