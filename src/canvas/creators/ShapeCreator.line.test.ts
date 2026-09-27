import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ShapeCreator line primitive', () => {
  const source = readFileSync('src/canvas/creators/ShapeCreator.ts', 'utf8');

  it('adds a real stroke-only Line mode independent from the Pen/path editor', () => {
    expect(source).toContain("'shape-line'");
    expect(source).toContain("case 'shape-line': return 'Line'");
    expect(source).toContain('`<path d="M0,${h} L${w},0" fill="none"');
    expect(source).toContain("if (shapeMode === 'shape-path')");
  });
});
