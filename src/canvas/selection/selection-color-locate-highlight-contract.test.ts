import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('src/canvas/selection/SelectionColorLocateHighlight.tsx', 'utf8');

describe('Selection color locate highlight visual contract', () => {
  it('keeps broad locate halos compact instead of the old fat blur', () => {
    expect(source).not.toContain('strokeWidth="27"');
    expect(source).not.toContain("filter: 'blur(17px)'");
    expect(source).not.toContain('strokeWidth="14" strokeLinejoin="round"\n      style');
    expect(source).toContain('strokeWidth="14"');
    expect(source).toContain('strokeWidth="7"');
  });

  it('uses SVG Gaussian blur for cross-browser softness', () => {
    expect(source).toContain('<feGaussianBlur stdDeviation="5.5" />');
    expect(source).toContain('<feGaussianBlur stdDeviation="3.25" />');
    expect(source).toContain('<feGaussianBlur stdDeviation="1.45" />');
  });

  it('adds a tight high-opacity definition layer', () => {
    expect(source).toContain('data-locate-glow="definition"');
    expect(source).toContain('strokeWidth="3.5"');
    expect(source).toContain("mode === 'click' ? 0.92 : 0.68");
  });
});
