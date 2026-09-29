import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fill = readFileSync(new URL('../tools/StylesTool/atoms/FillControl.tsx', import.meta.url), 'utf8');
const shaderTab = readFileSync(new URL('./ShaderFillTab.tsx', import.meta.url), 'utf8');
const layers = readFileSync(new URL('../LayersPanel.tsx', import.meta.url), 'utf8');
const elementData = readFileSync(new URL('../../shared/insert-items/element-data.ts', import.meta.url), 'utf8');

describe('Shader Fill reuse contract', () => {
  it('exposes Shader as a Fill type without creating a new shader renderer', () => {
    expect(fill).toContain("'shader'");
    expect(fill).toContain("title: 'Shader'");
    expect(shaderTab).toContain('installBuiltInCodeComponent');
    expect(shaderTab).toContain('getToolbarItemConfig');
    expect(shaderTab).toContain('CodeComponentControlField');
    expect(shaderTab).not.toContain('WebGLRenderingContext');
    expect(shaderTab).not.toContain('createShader');
  });

  it('reuses the existing shader library as the single catalog source', () => {
    expect(elementData).toContain('export const SHADER_LIBRARY_ITEMS');
    expect(shaderTab).toContain('SHADER_LIBRARY_ITEMS.map');
    expect(shaderTab).toContain('SHADER_THUMBS[item.id]');
  });

  it('models the shader as a managed source child while hiding implementation detail from Layers', () => {
    expect(shaderTab).toContain("'data-field-shader-fill'");
    expect(shaderTab).toContain("'data-field-shader-layer': 'true'");
    expect(layers).toContain("node.attrs?.['data-field-shader-layer'] === 'true'");
  });
});
