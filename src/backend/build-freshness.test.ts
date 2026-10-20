// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createStore } from 'jotai';
import { reloadToLatestBuild } from './build-freshness';
import { deployedBuildDiffers } from './build-info';
import { saveStatusAtom } from './save-store';

describe('deployedBuildDiffers', () => {
  it('only reports a difference when both identities are known', () => {
    expect(deployedBuildDiffers({ commitSha: 'a'.repeat(40) }, { commitSha: 'b'.repeat(40) })).toBe(true);
    expect(deployedBuildDiffers({ commitSha: 'a'.repeat(40) }, { commitSha: 'a'.repeat(40) })).toBe(false);
    expect(deployedBuildDiffers({ commitSha: 'unknown' }, { commitSha: 'b'.repeat(40) })).toBe(false);
    expect(deployedBuildDiffers({ commitSha: 'a'.repeat(40) }, { commitSha: 'unknown' })).toBe(false);
  });
});

describe('reloadToLatestBuild', () => {
  it('reloads immediately when the project is saved', async () => {
    const store = createStore();
    store.set(saveStatusAtom, 'saved');
    const reload = vi.fn();
    const flush = vi.fn();
    expect(await reloadToLatestBuild({ store, reload, flush })).toEqual({ ok: true });
    expect(flush).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('saves first, then reloads', async () => {
    const store = createStore();
    store.set(saveStatusAtom, 'unsaved');
    const reload = vi.fn();
    const flush = vi.fn(async () => { store.set(saveStatusAtom, 'saved'); });
    expect(await reloadToLatestBuild({ store, reload, flush, isOnline: () => true })).toEqual({ ok: true });
    expect(flush).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('never reloads over unsaved or offline changes', async () => {
    const store = createStore();
    store.set(saveStatusAtom, 'unsaved');
    const reload = vi.fn();
    expect(await reloadToLatestBuild({ store, reload, flush: vi.fn(), isOnline: () => false })).toEqual({ ok: false, reason: 'offline' });
    expect(await reloadToLatestBuild({ store, reload, flush: vi.fn(async () => { throw new Error('conflict'); }), isOnline: () => true })).toEqual({ ok: false, reason: 'unsaved' });
    expect(await reloadToLatestBuild({ store, reload, flush: vi.fn(), isOnline: () => true })).toEqual({ ok: false, reason: 'unsaved' });
    expect(reload).not.toHaveBeenCalled();
  });
});
