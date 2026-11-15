import { describe, expect, it } from 'vitest';
import { MESH_GRADIENT_COMPONENT } from './default-code-components/MeshGradient';
import {
  LEGACY_PAPER_WEBGL_COPY_PROPS, PAPER_WEBGL_COPY_PROPS,
  LEGACY_PAPER_WEBGL_DISPOSAL, LEGACY_PAPER_WEBGL_FIT, PAPER_WEBGL_DISPOSAL, PAPER_WEBGL_FIT,
} from './default-code-components/paper-webgl-mount';
import { migrateShaderRuntimeFiles } from './shader-runtime-migration';

const legacy = MESH_GRADIENT_COMPONENT
  .replace(PAPER_WEBGL_COPY_PROPS, LEGACY_PAPER_WEBGL_COPY_PROPS)
  .replace(PAPER_WEBGL_DISPOSAL, LEGACY_PAPER_WEBGL_DISPOSAL)
  .replace(PAPER_WEBGL_FIT, LEGACY_PAPER_WEBGL_FIT);

describe('saved Paper shader runtime migration', () => {
  it('repairs stock and named project shaders while retaining authored controls', () => {
    const custom = '/** @fieldCustomShader */\n' + legacy.replace('speed = 1', 'speed = 2.5');
    const files = new Map([
      ['components/MeshGradient.tsx', legacy],
      ['components/EveningSky.tsx', custom],
    ]);
    migrateShaderRuntimeFiles(files);
    expect(files.get('components/MeshGradient.tsx')).toBe(MESH_GRADIENT_COMPONENT);
    expect(files.get('components/EveningSky.tsx')).toBe('/** @fieldCustomShader */\n' + MESH_GRADIENT_COMPONENT.replace('speed = 1', 'speed = 2.5'));
    const migrated = [...files];
    migrateShaderRuntimeFiles(files);
    expect([...files]).toEqual(migrated);
  });

  it('repairs the helper independently of the mount and preserves authored changes', () => {
    const authoredCleanup = legacy.replace('if (ext) ext.loseContext();', 'if (ext && releaseOnDispose) ext.loseContext();');
    const authoredFit = legacy.replace('if (lr) gl.uniform2f(lr, tw, th);', 'if (lr) gl.uniform2f(lr, tw * 2, th * 2);');
    const oldHelperOnly = MESH_GRADIENT_COMPONENT.replace(PAPER_WEBGL_COPY_PROPS, LEGACY_PAPER_WEBGL_COPY_PROPS);
    const files = new Map([
      ['components/MeshGradient.tsx', oldHelperOnly],
      ['components/GemSmoke.tsx', authoredCleanup],
      ['components/GrainGradient.tsx', authoredFit],
      ['components/Unrelated.tsx', legacy],
    ]);
    migrateShaderRuntimeFiles(files);
    expect(files.get('components/MeshGradient.tsx')).toBe(MESH_GRADIENT_COMPONENT);
    expect(files.get('components/GemSmoke.tsx')).toBe(authoredCleanup.replace(LEGACY_PAPER_WEBGL_COPY_PROPS, PAPER_WEBGL_COPY_PROPS));
    expect(files.get('components/GrainGradient.tsx')).toBe(authoredFit.replace(LEGACY_PAPER_WEBGL_COPY_PROPS, PAPER_WEBGL_COPY_PROPS));
    expect(files.get('components/Unrelated.tsx')).toBe(legacy);
  });
});
