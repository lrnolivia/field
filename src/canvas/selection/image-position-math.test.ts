import { describe, expect, it } from 'vitest';
import {
  dragImagePosition, parsePositionPercent, renderedImageSize, screenDeltaToLocal, formatPositionPercent,
} from './image-position-math';

const box = { width: 400, height: 300 };
const natural = { width: 1600, height: 900 };

describe('renderedImageSize', () => {
  it('cover fills the box and overflows the long axis', () => {
    const size = renderedImageSize('cover', box, natural)!;
    expect(size.width).toBeCloseTo(1600 / 3, 6);
    expect(size.height).toBeCloseTo(300, 6);
  });
  it('contain fits inside the box', () => {
    expect(renderedImageSize('contain', box, natural)).toEqual({ width: 400, height: 225 });
  });
  it('explicit and partial sizes', () => {
    expect(renderedImageSize('200px', box, natural)).toEqual({ width: 200, height: 112.5 });
    expect(renderedImageSize('50% 50%', box, natural)).toEqual({ width: 200, height: 150 });
    expect(renderedImageSize('100% 100%', box, null)).toEqual(box);
    expect(renderedImageSize('auto', box, natural)).toEqual(natural);
  });
  it('needs the natural size for ratio-based modes', () => {
    expect(renderedImageSize('cover', box, null)).toBeNull();
  });
});

describe('dragImagePosition', () => {
  it('cover: the image follows the pointer and stays covering the box', () => {
    const img = renderedImageSize('cover', box, natural)!;      // 533.33 x 300
    const overflow = img.width - box.width;                       // 133.33
    // Drag the image right by 1/4 of its overflow → position moves left 25%.
    const p = dragImagePosition({ x: 50, y: 50 }, { x: overflow / 4, y: 40 }, box, img);
    expect(p.x).toBeCloseTo(25, 6);
    expect(p.y).toBe(50); // no vertical overflow: cannot move
    expect(dragImagePosition({ x: 50, y: 50 }, { x: 10_000, y: 0 }, box, img).x).toBe(0);
  });
  it('contain: the image moves inside the box', () => {
    const img = renderedImageSize('contain', box, natural)!;    // 400 x 225
    const p = dragImagePosition({ x: 50, y: 50 }, { x: 0, y: 37.5 }, box, img);
    expect(p.y).toBeCloseTo(100, 6);
  });
});

describe('parse/format', () => {
  it('reads keywords and percentages', () => {
    expect(parsePositionPercent('center')).toEqual({ x: 50, y: 50 });
    expect(parsePositionPercent('left top')).toEqual({ x: 0, y: 0 });
    expect(parsePositionPercent('25% 75%')).toEqual({ x: 25, y: 75 });
    expect(parsePositionPercent('bottom')).toEqual({ x: 50, y: 100 });
    expect(formatPositionPercent({ x: 33.333, y: 50 })).toBe('33.33% 50%');
  });
});

describe('screenDeltaToLocal', () => {
  it('divides out camera zoom', () => {
    const quad = { TL: { x: 0, y: 0 }, TR: { x: 800, y: 0 }, BL: { x: 0, y: 600 } };
    expect(screenDeltaToLocal({ x: 20, y: 10 }, quad, box)).toEqual({ x: 10, y: 5 });
  });
  it('un-rotates a rotated box', () => {
    // 90° rotation: local +x points down the screen.
    const quad = { TL: { x: 300, y: 0 }, TR: { x: 300, y: 400 }, BL: { x: 0, y: 0 } };
    const local = screenDeltaToLocal({ x: 0, y: 50 }, quad, box);
    expect(local.x).toBeCloseTo(50, 6);
    expect(local.y).toBeCloseTo(0, 6);
  });
});
