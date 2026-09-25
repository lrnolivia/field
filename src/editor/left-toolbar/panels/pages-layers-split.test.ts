import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGES_RATIO,
  MAX_PAGES_RATIO,
  MIN_PAGES_RATIO,
  clampPagesRatio,
  parseStoredPagesRatio,
  ratioFromPointer,
} from './pages-layers-split';

describe('Pages/Layers splitter', () => {
  it('tracks the pointer as a panel-relative ratio', () => {
    expect(ratioFromPointer(375, 100, 1000)).toBeCloseTo(0.275);
  });

  it('clamps pointer movement to usable pane sizes', () => {
    expect(ratioFromPointer(-500, 100, 1000)).toBe(MIN_PAGES_RATIO);
    expect(ratioFromPointer(5000, 100, 1000)).toBe(MAX_PAGES_RATIO);
  });

  it('restores a persisted ratio safely', () => {
    expect(parseStoredPagesRatio('0.4')).toBe(0.4);
    expect(parseStoredPagesRatio('0.01')).toBe(MIN_PAGES_RATIO);
    expect(parseStoredPagesRatio('4')).toBe(MAX_PAGES_RATIO);
    expect(parseStoredPagesRatio('garbage')).toBe(DEFAULT_PAGES_RATIO);
    expect(parseStoredPagesRatio(null)).toBe(DEFAULT_PAGES_RATIO);
  });

  it('falls back for non-finite values and invalid geometry', () => {
    expect(clampPagesRatio(Number.NaN)).toBe(DEFAULT_PAGES_RATIO);
    expect(ratioFromPointer(10, 0, 0)).toBe(DEFAULT_PAGES_RATIO);
  });
});
