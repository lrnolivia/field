import { describe, it, expect } from 'vitest';
import { placeInsertPalette } from './palette-placement';
describe('measured Insert palette placement', () => {
  it('follows a resized menu instead of the former fixed 308px boundary', () => {
    const result = placeInsertPalette({ left: 52, right: 532 }, 1440);
    expect(result).toEqual({ inline: false, opensLeft: false, width: 270, left: 532 });
  });
  it('uses the other side when the right edge cannot hold readable cards', () => {
    const result = placeInsertPalette({ left: 650, right: 900 }, 1000);
    expect(result.opensLeft).toBe(true); expect(result.left + result.width).toBe(650);
  });
  it('flows content inline when neither side fits, instead of covering the menu', () => {
    expect(placeInsertPalette({ left: 16, right: 366 }, 390).inline).toBe(true);
  });
  it.each([610, 640, 700, 1000, 1440])('never exceeds the viewport or crosses the parent at %i', viewport => {
    const parent = { left: 52, right: 380 };
    const result = placeInsertPalette(parent, viewport);
    if (!result.inline) {
      expect(result.left).toBeGreaterThanOrEqual(8);
      expect(result.left + result.width).toBeLessThanOrEqual(viewport - 8);
      expect(result.opensLeft ? result.left + result.width : result.left).toBe(result.opensLeft ? parent.left : parent.right);
    }
  });
});
