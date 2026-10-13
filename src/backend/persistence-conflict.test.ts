// persistence-conflict.test.ts — a legitimate stale-session 412 is a durable
// client conflict state, not a transient save error. The stale ProjectFS stays
// in memory, retries stop, and publish/explicit flush remains fail-closed.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultStore } from 'jotai';

const mocks = vi.hoisted(() => ({
  saveProject: vi.fn(),
}));

vi.mock('./index', () => ({
  backend: { saveProject: mocks.saveProject },
}));
vi.mock('./project-id', () => ({
  getProjectId: () => 'project-1',
}));
vi.mock('@/shared/cloud-flag', () => ({ CLOUD_ENABLED: false }));
vi.mock('../code/project/project-fs', () => ({
  projectFS: {
    toEnvelope: () => ({
      format: 'revyme-v1',
      files: { 'app/page.client.tsx': 'export default function Page() { return null; }' },
    }),
    subscribeWrites: () => () => {},
  },
}));

import {
  cancelPendingAutosave,
  flushSaveNow,
  triggerAutosave,
} from './autosave';
import { persistenceConflictAtom } from './persistence-conflict';

const store = getDefaultStore();

describe('persistence conflict autosave integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.saveProject.mockReset();
    store.set(persistenceConflictAtom, null);
    cancelPendingAutosave();
  });

  it('does not create a multi-session conflict for a generic failed save', async () => {
    mocks.saveProject.mockRejectedValueOnce(new Error('503'));

    triggerAutosave();
    await vi.advanceTimersByTimeAsync(2000);

    expect(mocks.saveProject).toHaveBeenCalledTimes(1);
    expect(store.get(persistenceConflictAtom)).toBeNull();

    // Stop the ordinary 5s transient-retry timer before restoring real timers.
    cancelPendingAutosave();
    vi.useRealTimers();
  });

  it('publishes the conflict state, freezes later writes, and keeps flush fail-closed', async () => {
    const conflict = Object.assign(new Error('Remote project changed in another session.'), {
      code: 'PERSISTENCE_CONFLICT',
      status: 412,
    });
    mocks.saveProject.mockRejectedValue(conflict);

    triggerAutosave();
    await vi.advanceTimersByTimeAsync(2000);

    const state = store.get(persistenceConflictAtom);
    expect(state?.projectId).toBe('project-1');
    expect(state?.message).toContain('saving is paused');
    expect(state?.detectedAt).toEqual(expect.any(Number));
    expect(mocks.saveProject).toHaveBeenCalledTimes(1);

    // More edits remain local but may not issue another stale conditional PUT.
    triggerAutosave();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mocks.saveProject).toHaveBeenCalledTimes(1);

    // Publish calls this first; it must stop before any deploy request.
    await expect(flushSaveNow()).rejects.toBe(conflict);

    // A generic cancel/reset helper must not silently resume this stale tab.
    cancelPendingAutosave();
    triggerAutosave();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mocks.saveProject).toHaveBeenCalledTimes(1);
    expect(store.get(persistenceConflictAtom)).toEqual(state);

    vi.useRealTimers();
  });
});
