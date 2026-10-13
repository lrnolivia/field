import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fill = readFileSync(resolve(process.cwd(), 'src/editor/tools/StylesTool/atoms/FillControl.tsx'), 'utf8');
const shell = readFileSync(resolve(process.cwd(), 'src/editor/ui/PaintPickerShell.tsx'), 'utf8');
const shaderTab = readFileSync(resolve(process.cwd(), 'src/editor/ui/ShaderFillTab.tsx'), 'utf8');
const layers = readFileSync(resolve(process.cwd(), 'src/editor/LayersPanel.tsx'), 'utf8');
const elementData = readFileSync(resolve(process.cwd(), 'src/shared/insert-items/element-data.ts'), 'utf8');

describe('Shader Fill reuse contract', () => {
  it('exposes Shader as a Fill type without creating a new shader renderer', () => {
    expect(fill).toContain("'shader'");
    expect(shell).toContain("shader: 'Shader'");
    expect(fill).toContain('<PaintPickerShell');
    expect(fill).toContain('<ShaderFillTab');
    expect(shaderTab).toContain('installBuiltInCodeComponent');
    expect(shaderTab).toContain('getToolbarItemConfig');
    expect(shaderTab).toContain('CodeComponentControlField');
    expect(shaderTab).not.toContain('WebGLRenderingContext');
    expect(shaderTab).not.toContain('createShader');
  });

  it('reuses the existing shader library as the single catalog source', () => {
    expect(elementData).toContain('export const SHADER_LIBRARY_ITEMS');
    expect(shaderTab).toContain('SHADER_LIBRARY_ITEMS.filter');
    expect(shaderTab).toContain('filteredItems.map');
    expect(shaderTab).toContain('<InsertItemPreview itemId={item.id} iconKey={item.iconKey}');
    const preview = readFileSync(resolve(process.cwd(), 'src/editor/media/InsertItemPreview.tsx'), 'utf8');
    expect(preview).toContain('ELEMENT_ICON_MAP[iconKey]');
    expect(preview).toContain('SHADER_THUMBS[itemId]');
  });

  it('models the shader as a managed source child while hiding implementation detail from Layers', () => {
    expect(shaderTab).toContain("'data-field-shader-fill'");
    expect(shaderTab).toContain("'data-field-shader-layer': 'true'");
    expect(layers).toContain("node.attrs?.['data-field-shader-layer'] === 'true'");
  });
});
