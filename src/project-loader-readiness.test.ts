import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectLoaderSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/ProjectLoader.tsx'),
  'utf8',
);
const appSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/App.tsx'),
  'utf8',
);
const canvasSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/canvas/Canvas.tsx'),
  'utf8',
);

describe('ProjectLoader canvas readiness contract', () => {
  it('keeps stalled-canvas recovery separate from Canvas-ready', () => {
    expect(projectLoaderSource).toContain('setCanvasStalled(true)');
    expect(projectLoaderSource).toContain("project-loader:canvas-delayed");
    expect(projectLoaderSource).toContain('canvasStalled && !canvasPainted');
  });

  it('does not mount a failed project as ready', () => {
    expect(projectLoaderSource).toContain("setLoadError(err instanceof Error ? err.message : String(err))");
    expect(projectLoaderSource).not.toContain("// Show app anyway so user isn't stuck on blank screen");
  });

  it('gates semantic readiness on the Canvas first-paint callback', () => {
    expect(canvasSource).toContain('onFirstCanvasPaint?.()');
    expect(canvasSource).toContain("trace.action('canvas:first-paint'");
    expect(projectLoaderSource).toContain('if (!canvasPainted) return;');
    expect(projectLoaderSource).toContain('onCanvasFirstPaint={() => setCanvasPainted(true)}');
    expect(projectLoaderSource).toContain('onCanvasReadyRef.current?.()');
  });

  it('keeps the mounted editor inert until the canvas reveal settles', () => {
    expect(appSource).toContain("root.setAttribute('inert', '')");
    expect(appSource).toContain("root.removeAttribute('inert')");
    expect(appSource).toContain('data-canvas-reveal-phase={canvasRevealPhase}');
    expect(projectLoaderSource).toContain('setEditorInteractive(true)');
    expect(projectLoaderSource).not.toContain('ProjectLoadingVeil');
  });

  it('hydrates a clean project session before exposing the new Canvas', () => {
    expect(projectLoaderSource).toContain('projectFS.fromEnvelope(projectEnvelope)');
    expect(projectLoaderSource).toContain('resetProjectSession(bootFile, bootCode)');
    expect(projectLoaderSource).not.toContain('projectFS.hydrateBranches(raw.branches, raw.activeBranchId)');
    expect(projectLoaderSource.indexOf('resetProjectSession(bootFile, bootCode)'))
      .toBeLessThan(projectLoaderSource.lastIndexOf('setReady(true)'));
  });

  it('drops stale loader results before they can rewrite project-global identity', () => {
    const loaded = projectLoaderSource.indexOf("trace.action('project-loader:load'");
    const cancelled = projectLoaderSource.lastIndexOf('if (cancelled) return;', loaded);
    expect(cancelled).toBeGreaterThan(-1);
    expect(cancelled).toBeLessThan(loaded);
  });

});
