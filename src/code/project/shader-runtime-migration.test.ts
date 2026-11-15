import { describe, expect, it } from 'vitest';
import { MESH_GRADIENT_COMPONENT } from './default-code-components/MeshGradient';
import { LEGACY_PAPER_WEBGL_DISPOSAL, PAPER_WEBGL_DISPOSAL } from './default-code-components/paper-webgl-mount';
import { migrateShaderRuntimeFiles } from './shader-runtime-migration';

const legacy = MESH_GRADIENT_COMPONENT.replace(PAPER_WEBGL_DISPOSAL, LEGACY_PAPER_WEBGL_DISPOSAL);

describe('saved Paper shader runtime migration', () => {
  it('repairs stock and named project shaders while retaining authored controls', () => {
    const custom = '/** @fieldCustomShader */\n' + legacy.replace('speed = 1', 'speed = 2.5');
    const files = new Map([
      ['components/MeshGradient.tsx', legacy],
      ['components/EveningSky.tsx', custom],
    ]);
    migrateShaderRuntimeFiles(files);
    expect(files.get('components/MeshGradient.tsx')).toBe(MESH_GRADIENT_COMPONENT);
    expect(files.get('components/EveningSky.tsx')).toBe(custom.replace(LEGACY_PAPER_WEBGL_DISPOSAL, PAPER_WEBGL_DISPOSAL));
    const migrated = [...files];
    migrateShaderRuntimeFiles(files);
    expect([...files]).toEqual(migrated);
  });

  it('leaves authored cleanup changes and unrelated files intact', () => {
    const files = new Map([
      ['components/MeshGradient.tsx', legacy.replace('if (ext) ext.loseContext();', 'if (ext && releaseOnDispose) ext.loseContext();')],
      ['components/Unrelated.tsx', legacy],
    ]);
    const before = [...files];
    migrateShaderRuntimeFiles(files);
    expect([...files]).toEqual(before);
  });
});
