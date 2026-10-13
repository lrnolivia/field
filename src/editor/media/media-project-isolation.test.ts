import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { createMediaSession, type MediaAsset, type MediaUploadItem } from './media-system';
import {
  mediaSessionAtom,
  mediaUploadQueueAtom,
  sessionMediaAssetsAtom,
  setMediaProjectIdAtom,
  upsertMediaUploadAtom,
  upsertSessionMediaAssetAtom,
} from './media-state';

const asset = (projectId: string, id: string): MediaAsset => ({
  id,
  projectId,
  url: 'https://media.example/' + id,
  kind: 'image',
  name: id + '.png',
  source: 'upload',
});

const upload = (
  projectId: string,
  id: string,
  status: MediaUploadItem['status'] = 'complete',
): MediaUploadItem => ({
  id,
  projectId,
  name: id + '.png',
  kind: 'image',
  status,
  progress: status === 'complete' ? 1 : 0,
});

describe('Media project isolation', () => {
  it('keeps catalog, upload history, and browser session scoped to the mounted project', () => {
    const store = createStore();

    store.set(setMediaProjectIdAtom, 'project-a');
    store.set(upsertSessionMediaAssetAtom, asset('project-a', 'a'));
    store.set(upsertMediaUploadAtom, upload('project-a', 'upload-a'));
    store.set(mediaSessionAtom, createMediaSession({ search: 'alpha' }));

    store.set(setMediaProjectIdAtom, 'project-b');
    expect(store.get(sessionMediaAssetsAtom)).toEqual([]);
    expect(store.get(mediaUploadQueueAtom)).toEqual([]);
    expect(store.get(mediaSessionAtom).search).toBe('');

    store.set(upsertSessionMediaAssetAtom, asset('project-b', 'b'));
    store.set(mediaSessionAtom, (current) => ({ ...current, search: 'beta' }));

    store.set(setMediaProjectIdAtom, 'project-a');
    expect(store.get(sessionMediaAssetsAtom).map((item) => item.id)).toEqual(['a']);
    expect(store.get(mediaUploadQueueAtom).map((item) => item.id)).toEqual(['upload-a']);
    expect(store.get(mediaSessionAtom).search).toBe('alpha');

    store.set(setMediaProjectIdAtom, 'project-b');
    expect(store.get(sessionMediaAssetsAtom).map((item) => item.id)).toEqual(['b']);
    expect(store.get(mediaSessionAtom).search).toBe('beta');
  });

  it('routes a late upload completion back to its owning project', () => {
    const store = createStore();

    store.set(setMediaProjectIdAtom, 'project-a');
    store.set(upsertMediaUploadAtom, upload('project-a', 'late-upload', 'uploading'));

    store.set(setMediaProjectIdAtom, 'project-b');
    store.set(upsertMediaUploadAtom, upload('project-a', 'late-upload', 'complete'));
    store.set(upsertSessionMediaAssetAtom, asset('project-a', 'late-asset'));

    expect(store.get(mediaUploadQueueAtom)).toEqual([]);
    expect(store.get(sessionMediaAssetsAtom)).toEqual([]);

    store.set(setMediaProjectIdAtom, 'project-a');
    expect(store.get(mediaUploadQueueAtom)).toEqual([
      expect.objectContaining({ id: 'late-upload', status: 'complete', projectId: 'project-a' }),
    ]);
    expect(store.get(sessionMediaAssetsAtom)).toEqual([
      expect.objectContaining({ id: 'late-asset', projectId: 'project-a' }),
    ]);
  });
});
