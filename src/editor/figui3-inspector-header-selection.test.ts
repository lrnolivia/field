import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 inspector header + selection colors contract', () => {
  it('uses the dedicated object header instead of the old flat row', () => {
    const source = read('src/editor/PropertiesPanel.tsx');
    expect(source).toContain('<InspectorObjectHeader');
    expect(source).not.toContain('data-inspector-variables');
  });

  it('keeps header actions deterministic', () => {
    const source = read('src/editor/controls/InspectorObjectHeader.tsx');
    expect(source).toContain('Go to main component');
    expect(source).toContain('Select matching layers');
    expect(source).toContain('Component properties');
    expect(source).toContain('From this file');
    expect(source).toContain('Variables');
    expect(source).not.toContain('Detach instance');
    expect(source).not.toContain('Reset instance');
  });

  it('matches FigUI3 selection-color overflow and hover-action grammar', () => {
    const source = read('src/editor/tools/SelectionTool.tsx');
    expect(source).toContain('Selection colors');
    expect(source).toContain('SELECTION_COLOR_VISIBLE_LIMIT = 10');
    expect(source).toContain('See all ${groups.length} colors');
    expect(source).toContain('Detach variable');
    expect(source).toContain('Select item using this color');
    expect(source).toContain('title="Style"');
    expect(source).toContain('<PresetPicker');
    expect(source).toContain('splitPaintOpacity');
    expect(source).toContain('serializePaintOpacity');
  });

  it('keeps style/preset surfaces neutral and exposes custom/library structure honestly', () => {
    const picker = read('src/editor/ui/PresetPicker.tsx');
    const color = read('src/editor/controls/ColorInput.tsx');
    expect(picker).toContain('Custom');
    expect(picker).toContain('Libraries');
    expect(picker).toContain('aria-disabled="true"');
    expect(picker).toContain('Search styles');
    expect(picker).toContain('All libraries');
    expect(color).not.toContain('bg-[var(--accent)] cut-corners cursor-pointer');
  });
});
