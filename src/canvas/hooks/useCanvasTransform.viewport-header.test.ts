import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('viewport header camera visibility contract', () => {
  it('keeps viewport headers visible while the camera pans or zooms', () => {
    const transform = read('src/canvas/hooks/useCanvasTransform.ts');
    expect(transform).toContain('updateViewportHeaderPositions(vpOverlay)');
    expect(transform).not.toContain('setViewportHeadersVisible(vpOverlay, false)');
    expect(transform).not.toContain('setViewportHeadersVisible(vpOverlay, true)');
    expect(transform).not.toContain('setViewportHeadersVisible,');
  });

  it('still lets direct viewport dragging hide the headers intentionally', () => {
    const renderer = read('src/canvas/hooks/useRendererSync.ts');
    expect(renderer).toContain('setViewportHeadersVisible(vpOverlay, !dragging)');
  });
});
