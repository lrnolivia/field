import {
  LEGACY_PAPER_WEBGL_COPY_PROPS,
  LEGACY_PAPER_WEBGL_DISPOSAL,
  LEGACY_PAPER_WEBGL_FIT,
  PAPER_WEBGL_COPY_PROPS,
  PAPER_WEBGL_DISPOSAL,
  PAPER_WEBGL_FIT,
} from './default-code-components/paper-webgl-mount';

const stockShaders = new Set([
  'MeshGradient', 'GemSmoke', 'GrainGradient', 'LiquidMetal', 'Metaballs', 'SmokeRing',
]);

/** Repair the vendored helper and cleanup in saved shaders, including named copies. */
export function migrateShaderRuntimeFiles(files: Map<string, string>): void {
  for (const [path, source] of files) {
    const tag = /^components\/([^/]+)\.tsx$/.exec(path)?.[1];
    if (!tag || (!stockShaders.has(tag) && !source.includes('/** @fieldCustomShader */'))) continue;
    const start = source.indexOf('function __psCreateMount(');
    const end = source.indexOf('// ─── End vendored engine', start);
    if (start < 0 || end < 0) continue;
    const bundleStart = source.indexOf('var __PAPER = (() => {');
    const beforeMount = bundleStart < 0 ? source.slice(0, start)
      : source.slice(0, bundleStart) + source.slice(bundleStart, start)
        .replace(LEGACY_PAPER_WEBGL_COPY_PROPS, PAPER_WEBGL_COPY_PROPS);
    const mount = source.slice(start, end);
    const repairedMount = mount.includes('var buf = gl.createBuffer();')
      && mount.includes(LEGACY_PAPER_WEBGL_DISPOSAL) && mount.includes(LEGACY_PAPER_WEBGL_FIT)
      ? mount.replace(LEGACY_PAPER_WEBGL_DISPOSAL, PAPER_WEBGL_DISPOSAL)
        .replace(LEGACY_PAPER_WEBGL_FIT, PAPER_WEBGL_FIT)
      : mount;
    const repaired = beforeMount + repairedMount + source.slice(end);
    if (repaired !== source) files.set(path, repaired);
  }
}
