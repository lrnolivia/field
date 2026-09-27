import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('src/canvas/selection/SelectionColorLocateHighlight.tsx', 'utf8');
const sandbox = fs.readFileSync('src/canvas-sandbox/sandbox/selection-color-locate.ts', 'utf8');

describe('Selection color locate geometry contract', () => {
  it('does not draw bounding polygons in the parent frame', () => {
    expect(source).not.toContain('<polygon');
    expect(source).not.toContain('getScreenCornersById');
    expect(source).toContain('setSelectionColorLocateHighlight');
  });

  it('uses painted-alpha drop shadows on the real sandbox element', () => {
    expect(sandbox).toContain('drop-shadow(0 0 0.65px');
    expect(sandbox).toContain('drop-shadow(0 0 1.65px');
    expect(sandbox).toContain('drop-shadow(0 0 3.25px');
    expect(sandbox).toContain('const animation = el.animate');
  });

  it('keeps the high-energy definition layer tighter than the atmosphere', () => {
    expect(sandbox).toContain('0.98 * strength');
    expect(sandbox).toContain('0.46 * strength');
    expect(sandbox).toContain('0.16 * strength');
  });
});
