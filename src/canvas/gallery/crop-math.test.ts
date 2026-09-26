import { describe, expect, it } from 'vitest';
import { coverOverflow, focalPositionAfterDrag, focalPositionAfterNudge, formatObjectPosition, parseObjectPosition } from './crop-math';

describe('gallery crop math', () => {
  it('parses and formats percentage object positions', () => {
    expect(parseObjectPosition('25% 75%')).toEqual({ x: 25, y: 75 });
    expect(formatObjectPosition({ x: 25.555, y: 75.555 })).toBe('25.56% 75.56%');
  });

  it('normalizes CSS object-position keywords without swapping axes', () => {
    expect(parseObjectPosition('top')).toEqual({ x: 50, y: 0 });
    expect(parseObjectPosition('right')).toEqual({ x: 100, y: 50 });
    expect(parseObjectPosition('top right')).toEqual({ x: 100, y: 0 });
    expect(parseObjectPosition('left bottom')).toEqual({ x: 0, y: 100 });
    expect(parseObjectPosition('center top')).toEqual({ x: 50, y: 0 });
    expect(parseObjectPosition('center 25%')).toEqual({ x: 50, y: 25 });
    expect(parseObjectPosition('25% center')).toEqual({ x: 25, y: 50 });
  });

  it('computes the actual cover overflow instead of using frame dimensions', () => {
    // 1000×500 into 400×300 covers at 0.6 => 600×300 => 200px horizontal overflow.
    expect(coverOverflow(400, 300, 1000, 500)).toEqual({ x: 200, y: 0 });
    // 500×1000 into 400×300 covers at 0.8 => 400×800 => 500px vertical overflow.
    expect(coverOverflow(400, 300, 500, 1000)).toEqual({ x: 0, y: 500 });
  });

  it('maps visual drag to normalized focal coordinates using overflow range', () => {
    expect(focalPositionAfterDrag({ x: 50, y: 50 }, 100, 50, 200, 0)).toEqual({ x: 0, y: 50 });
    expect(focalPositionAfterDrag({ x: 50, y: 50 }, 0, -250, 0, 500)).toEqual({ x: 50, y: 100 });
    expect(focalPositionAfterDrag({ x: 5, y: 95 }, 500, -500, 200, 500)).toEqual({ x: 0, y: 100 });
  });

  it('supports keyboard nudging only on axes that can visibly reposition', () => {
    expect(focalPositionAfterNudge({ x: 50, y: 50 }, -1, 0, 200, 0)).toEqual({ x: 51, y: 50 });
    expect(focalPositionAfterNudge({ x: 50, y: 50 }, 0, 5, 0, 500)).toEqual({ x: 50, y: 45 });
    expect(focalPositionAfterNudge({ x: 99, y: 1 }, -5, 5, 200, 500)).toEqual({ x: 100, y: 0 });
  });
});
