// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { svgPaintSignature } from './measure';

const SVG_NS = 'http://www.w3.org/2000/svg';

function shape(): { svg: SVGSVGElement; rect: SVGRectElement } {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 160 120');
  svg.setAttribute('style', 'position: absolute; left: 10px; width: 160px; height: 120px');
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('width', '160');
  rect.setAttribute('height', '120');
  rect.setAttribute('fill', '#d9d9d9');
  svg.appendChild(rect);
  return { svg, rect };
}

describe('svgPaintSignature (measure reuse gate)', () => {
  it('changes when the inner shape rotation attribute changes', () => {
    const { svg, rect } = shape();
    const before = svgPaintSignature(svg);
    rect.setAttribute('transform', 'rotate(30 80 60)');
    expect(svgPaintSignature(svg)).not.toBe(before);
    rect.removeAttribute('transform');
    expect(svgPaintSignature(svg)).toBe(before);
  });

  it('changes on viewBox and geometry edits', () => {
    const { svg, rect } = shape();
    const before = svgPaintSignature(svg);
    svg.setAttribute('viewBox', '0 0 200 120');
    const afterViewBox = svgPaintSignature(svg);
    expect(afterViewBox).not.toBe(before);
    rect.setAttribute('width', '200');
    expect(svgPaintSignature(svg)).not.toBe(afterViewBox);
  });

  it('ignores paint-irrelevant attributes so unchanged vectors keep reusing', () => {
    const { svg, rect } = shape();
    const before = svgPaintSignature(svg);
    rect.setAttribute('fill', '#ff0000');
    rect.setAttribute('data-selected', 'true');
    expect(svgPaintSignature(svg)).toBe(before);
  });
});
