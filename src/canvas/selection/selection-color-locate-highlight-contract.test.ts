import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('src/canvas/selection/SelectionColorLocateHighlight.tsx', 'utf8');
const sandbox = fs.readFileSync('src/canvas-sandbox/sandbox/selection-color-locate.ts', 'utf8');

describe('Selection color locate geometry + Figma-pass contract', () => {
  it('stays on painted geometry, never parent-frame polygons', () => {
    expect(source).not.toContain('<polygon');
    expect(source).not.toContain('getScreenCornersById');
    expect(source).toContain('setSelectionColorLocateHighlight');
  });

  it('uses a 1px white inner alpha edge at 50% normal compositing', () => {
    expect(sandbox).toContain('operator="erode" radius="1"');
    expect(sandbox).toContain('flood-color="#ffffff" flood-opacity="0.5"');
    expect(sandbox).toContain('<feMergeNode in="SourceGraphic" />');
    expect(sandbox).not.toContain('mode="overlay"');
  });

  it('breathes radius as well as opacity for salience', () => {
    expect(sandbox).toContain('0.78');
    expect(sandbox).toContain('1.32');
    expect(sandbox).toContain('const settle = buildSelectionColorLocateFilter');
    expect(sandbox).toContain("mode === 'click' ? 1800 : 2200");
  });
});
