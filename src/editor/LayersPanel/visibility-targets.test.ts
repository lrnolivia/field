// The eye icon wrote only the clicked row, so hiding four selected frames hid
// one of them (user report 2026-09-21).

import { describe, it, expect } from 'vitest';
import { layerActionTargets, lockTogglePlan, visibilityToggleTargets } from './rows';

const all = () => true;

describe('visibilityToggleTargets', () => {
  it('applies to the whole selection when the clicked row is part of it', () => {
    expect(visibilityToggleTargets(['a', 'b', 'c', 'd'], 'a', all)).toEqual(['a', 'b', 'c', 'd']);
    expect(visibilityToggleTargets(['a', 'b', 'c', 'd'], 'd', all)).toEqual(['a', 'b', 'c', 'd']);
  });

  // Clicking the eye on an unrelated row must not hide your selection.
  it('acts on one node when the clicked row is OUTSIDE the selection', () => {
    expect(visibilityToggleTargets(['a', 'b'], 'z', all)).toEqual(['z']);
  });

  it('acts on one node for a single selection', () => {
    expect(visibilityToggleTargets(['a'], 'a', all)).toEqual(['a']);
    expect(visibilityToggleTargets([], 'a', all)).toEqual(['a']);
  });

  it('drops ids that are no longer in the tree', () => {
    expect(visibilityToggleTargets(['a', 'gone', 'c'], 'a', (id) => id !== 'gone')).toEqual(['a', 'c']);
  });

  it('falls back to the clicked row if the whole selection is stale', () => {
    expect(visibilityToggleTargets(['x', 'y'], 'x', () => false)).toEqual(['x']);
  });
});

describe('layerActionTargets', () => {
  it('uses the whole live selection only when the clicked row belongs to it', () => {
    expect(layerActionTargets(['a', 'b', 'c'], 'b', all)).toEqual(['a', 'b', 'c']);
    expect(layerActionTargets(['a', 'b', 'c'], 'z', all)).toEqual(['z']);
  });
});

describe('lockTogglePlan', () => {
  it('locks a mixed selection to match the clicked unlocked row next state', () => {
    const locked = new Set(['b']);
    expect(lockTogglePlan(
      ['a', 'b', 'c'],
      'a',
      all,
      (id) => locked.has(id),
    )).toEqual({ ids: ['a', 'c'], locked: true });
  });

  it('unlocks a mixed selection to match the clicked locked row next state', () => {
    const locked = new Set(['a', 'c']);
    expect(lockTogglePlan(
      ['a', 'b', 'c'],
      'a',
      all,
      (id) => locked.has(id),
    )).toEqual({ ids: ['a', 'c'], locked: false });
  });

  it('stays a single-row action outside the current selection', () => {
    expect(lockTogglePlan(
      ['a', 'b'],
      'z',
      all,
      () => false,
    )).toEqual({ ids: ['z'], locked: true });
  });

  it('drops stale selected ids before planning lock writes', () => {
    expect(lockTogglePlan(
      ['a', 'gone', 'c'],
      'a',
      (id) => id !== 'gone',
      () => false,
    )).toEqual({ ids: ['a', 'c'], locked: true });
  });
});

