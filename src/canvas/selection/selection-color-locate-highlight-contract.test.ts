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

  it('uses a 1px WHITE inner alpha-edge in overlay mode and no outer edge stroke', () => {
    expect(sandbox).toContain('operator="erode" radius="1"');
    expect(sandbox).toContain('flood-color="#ffffff"');
    expect(sandbox).toContain('mode="overlay"');
    expect(sandbox).not.toContain('operator="dilate"');
  });

  it('orders the three glow layers front 0.5x, middle 1x, back 1.5x', () => {
    expect(sandbox).toContain('const frontRadius = originalRadius * 0.5');
    expect(sandbox).toContain('const backRadius = originalRadius * 1.5');
    expect(sandbox).toContain('0.92 * strength');
    expect(sandbox).toContain('0.56 * strength');
  });
});
