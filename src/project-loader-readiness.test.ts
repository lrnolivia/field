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
  it('does not convert the four-second delay threshold into Canvas-ready', () => {
    expect(projectLoaderSource).toContain("setDelayed(true)");
    expect(projectLoaderSource).toContain("project-loader:canvas-delayed");
    expect(projectLoaderSource).not.toContain("const failsafe = setTimeout(finish, 4000)");
  });

  it('does not mount a failed project as ready', () => {
    expect(projectLoaderSource).toContain("setLoadError(err instanceof Error ? err.message : String(err))");
    expect(projectLoaderSource).not.toContain("// Show app anyway so user isn't stuck on blank screen");
  });

  it('gates semantic readiness on the Canvas first-paint callback', () => {
    expect(canvasSource).toContain('onFirstCanvasPaint?.()');
    expect(canvasSource).toContain("trace.action('canvas:first-paint'");
    expect(projectLoaderSource).toContain('painted={ready && canvasPainted}');
    expect(projectLoaderSource).toContain('onCanvasFirstPaint={() => setCanvasPainted(true)}');
  });

  it('keeps the mounted editor inert until the paint-gated overlay finishes', () => {
    expect(appSource).toContain("root.setAttribute('inert', '')");
    expect(appSource).toContain("root.removeAttribute('inert')");
    expect(projectLoaderSource).toContain('setEditorInteractive(true)');
  });
});
