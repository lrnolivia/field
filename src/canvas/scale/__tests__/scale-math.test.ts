import { describe, expect, it } from 'vitest';
import {
  anchorPoint,
  canonicalizeScaleRoots,
  scaleBoxFromAnchor,
  scaleFactorFromPointer,
  scalePoint,
} from '../scale-math';

describe('Scale uniform geometry', () => {
  it('keeps the chosen center anchor fixed while scaling the box', () => {
    const box = { left: 10, top: 20, width: 100, height: 50 };
    const before = anchorPoint(box, 'center');
    const after = scaleBoxFromAnchor(box, 'center', 2);
    expect(after).toEqual({ left: -40, top: -5, width: 200, height: 100 });
    expect(anchorPoint(after, 'center')).toEqual(before);
  });

  it('implements P prime = A + s(P - A)', () => {
    expect(scalePoint({ x: 20, y: 30 }, { x: 10, y: 10 }, 1.5)).toEqual({ x: 25, y: 40 });
  });

  it('uses pointer projection for a stable uniform factor', () => {
    expect(scaleFactorFromPointer({ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 100 })).toBeCloseTo(2, 8);
    // Perpendicular pointer noise should not turn into non-uniform Scale.
    expect(scaleFactorFromPointer({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 150, y: 80 })).toBeCloseTo(1.5, 8);
  });

  it('canonicalizes ancestor + descendant selections to top-level roots', () => {
    const nodes = new Map([
      ['a', { parentId: null }],
      ['b', { parentId: 'a' }],
      ['c', { parentId: null }],
    ]);
    expect(canonicalizeScaleRoots(['b', 'a', 'c', 'b'], nodes)).toEqual(['a', 'c']);
  });
});
