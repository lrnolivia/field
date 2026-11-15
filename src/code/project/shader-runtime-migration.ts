import {
  LEGACY_PAPER_WEBGL_DISPOSAL,
  PAPER_WEBGL_DISPOSAL,
} from './default-code-components/paper-webgl-mount';

const stockShaders = new Set([
  'MeshGradient', 'GemSmoke', 'GrainGradient', 'LiquidMetal', 'Metaballs', 'SmokeRing',
]);

/** Repair the generated cleanup in saved shaders, including named copies. */
export function migrateShaderRuntimeFiles(files: Map<string, string>): void {
  for (const [path, source] of files) {
    const tag = /^components\/([^/]+)\.tsx$/.exec(path)?.[1];
    if (!tag || (!stockShaders.has(tag) && !source.includes('/** @fieldCustomShader */'))) continue;
    const start = source.indexOf('function __psCreateMount(');
    const end = source.indexOf('// ─── End vendored engine', start);
    if (start < 0 || end < 0) continue;
    const mount = source.slice(start, end);
    if (!mount.includes('var buf = gl.createBuffer();') || !mount.includes(LEGACY_PAPER_WEBGL_DISPOSAL)) continue;
    const repaired = mount.replace(LEGACY_PAPER_WEBGL_DISPOSAL, PAPER_WEBGL_DISPOSAL);
    files.set(path, source.slice(0, start) + repaired + source.slice(end));
  }
}
