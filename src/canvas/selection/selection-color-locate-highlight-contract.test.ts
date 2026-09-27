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

  it('builds a true alpha-edge keyline from the rendered object silhouette', () => {
    expect(sandbox).toContain('operator="erode" radius="1.5"');
    expect(sandbox).toContain('operator="dilate" radius="1"');
    expect(sandbox).toContain('mode="overlay"');
    expect(sandbox).toContain('flood-opacity="0.96"');
    expect(sandbox).toContain('flood-opacity="0.82"');
  });

  it('keeps the luminous stack tight and stronger than the old subtle recipe', () => {
    expect(sandbox).toContain('drop-shadow(0 0 0.45px');
    expect(sandbox).toContain('drop-shadow(0 0 1.25px');
    expect(sandbox).toContain('drop-shadow(0 0 2.35px');
    expect(sandbox).toContain('1.00 * strength');
    expect(sandbox).toContain('0.88 * strength');
  });
});
