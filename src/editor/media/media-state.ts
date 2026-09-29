import { atom } from 'jotai';
import { getProjectId } from '@/backend/project-id';
import {
  createMediaSession,
  type MediaAsset,
  type MediaSession,
  type MediaUploadItem,
} from './media-system';

type MediaStateUpdate<T> = T | ((current: T) => T);
type ProjectBuckets<T> = Record<string, T>;

const EMPTY_MEDIA_ASSETS: MediaAsset[] = [];
const EMPTY_MEDIA_UPLOADS: MediaUploadItem[] = [];

function normalizeMediaProjectId(projectId: string): string {
  return projectId.trim() || 'local';
}

const mediaProjectIdAtom = atom(normalizeMediaProjectId(getProjectId()));
const mediaSessionsByProjectAtom = atom<ProjectBuckets<MediaSession>>({});
const mediaUploadQueuesByProjectAtom = atom<ProjectBuckets<MediaUploadItem[]>>({});
const sessionMediaAssetsByProjectAtom = atom<ProjectBuckets<MediaAsset[]>>({});

/**
 * Switch Media context with the mounted field project while preserving each
 * project's in-session browser state, catalog, and upload history.
 */
export const setMediaProjectIdAtom = atom(null, (_get, set, projectId: string) => {
  set(mediaProjectIdAtom, normalizeMediaProjectId(projectId));
});

export const mediaSessionAtom = atom(
  (get) => {
    const projectId = get(mediaProjectIdAtom);
    return get(mediaSessionsByProjectAtom)[projectId] ?? createMediaSession();
  },
  (get, set, update: MediaStateUpdate<MediaSession>) => {
    const projectId = get(mediaProjectIdAtom);
    const buckets = get(mediaSessionsByProjectAtom);
    const current = buckets[projectId] ?? createMediaSession();
    const next = typeof update === 'function'
      ? (update as (value: MediaSession) => MediaSession)(current)
      : update;
    set(mediaSessionsByProjectAtom, { ...buckets, [projectId]: next });
  },
);

export const mediaUploadQueueAtom = atom(
  (get) => {
    const projectId = get(mediaProjectIdAtom);
    return get(mediaUploadQueuesByProjectAtom)[projectId] ?? EMPTY_MEDIA_UPLOADS;
  },
  (get, set, update: MediaStateUpdate<MediaUploadItem[]>) => {
    const projectId = get(mediaProjectIdAtom);
    const buckets = get(mediaUploadQueuesByProjectAtom);
    const current = buckets[projectId] ?? EMPTY_MEDIA_UPLOADS;
    const next = typeof update === 'function'
      ? (update as (value: MediaUploadItem[]) => MediaUploadItem[])(current)
      : update;
    set(mediaUploadQueuesByProjectAtom, { ...buckets, [projectId]: next });
  },
);

export const sessionMediaAssetsAtom = atom(
  (get) => {
    const projectId = get(mediaProjectIdAtom);
    return get(sessionMediaAssetsByProjectAtom)[projectId] ?? EMPTY_MEDIA_ASSETS;
  },
  (get, set, update: MediaStateUpdate<MediaAsset[]>) => {
    const projectId = get(mediaProjectIdAtom);
    const buckets = get(sessionMediaAssetsByProjectAtom);
    const current = buckets[projectId] ?? EMPTY_MEDIA_ASSETS;
    const next = typeof update === 'function'
      ? (update as (value: MediaAsset[]) => MediaAsset[])(current)
      : update;
    set(sessionMediaAssetsByProjectAtom, { ...buckets, [projectId]: next });
  },
);

export const upsertSessionMediaAssetAtom = atom(null, (get, set, asset: MediaAsset) => {
  const projectId = normalizeMediaProjectId(asset.projectId);
  const buckets = get(sessionMediaAssetsByProjectAtom);
  const assets = buckets[projectId] ?? EMPTY_MEDIA_ASSETS;
  const index = assets.findIndex((item) => item.id === asset.id || item.url === asset.url);
  const next = [...assets];

  if (index < 0) next.unshift(asset);
  else next[index] = { ...next[index], ...asset };

  set(sessionMediaAssetsByProjectAtom, { ...buckets, [projectId]: next });
});

export const removeSessionMediaAssetAtom = atom(null, (get, set, id: string) => {
  const projectId = get(mediaProjectIdAtom);
  const buckets = get(sessionMediaAssetsByProjectAtom);
  const assets = buckets[projectId] ?? EMPTY_MEDIA_ASSETS;
  set(sessionMediaAssetsByProjectAtom, {
    ...buckets,
    [projectId]: assets.filter((item) => item.id !== id),
  });
});

export const resetMediaSessionAtom = atom(null, (get, set, next?: Partial<MediaSession>) => {
  const projectId = get(mediaProjectIdAtom);
  const buckets = get(mediaSessionsByProjectAtom);
  set(mediaSessionsByProjectAtom, {
    ...buckets,
    [projectId]: createMediaSession(next),
  });
});

export const patchMediaSessionAtom = atom(null, (get, set, patch: Partial<MediaSession>) => {
  const projectId = get(mediaProjectIdAtom);
  const buckets = get(mediaSessionsByProjectAtom);
  const current = buckets[projectId] ?? createMediaSession();
  set(mediaSessionsByProjectAtom, {
    ...buckets,
    [projectId]: {
      ...current,
      ...patch,
      route: patch.route ?? current.route,
    },
  });
});

export const upsertMediaUploadAtom = atom(null, (get, set, item: MediaUploadItem) => {
  const projectId = normalizeMediaProjectId(item.projectId);
  const buckets = get(mediaUploadQueuesByProjectAtom);
  const queue = buckets[projectId] ?? EMPTY_MEDIA_UPLOADS;
  const index = queue.findIndex((entry) => entry.id === item.id);
  const next = [...queue];

  if (index < 0) next.push(item);
  else next[index] = item;

  set(mediaUploadQueuesByProjectAtom, { ...buckets, [projectId]: next });
});

export const removeMediaUploadAtom = atom(null, (get, set, id: string) => {
  const projectId = get(mediaProjectIdAtom);
  const buckets = get(mediaUploadQueuesByProjectAtom);
  const queue = buckets[projectId] ?? EMPTY_MEDIA_UPLOADS;
  set(mediaUploadQueuesByProjectAtom, {
    ...buckets,
    [projectId]: queue.filter((item) => item.id !== id),
  });
});

export const clearFinishedMediaUploadsAtom = atom(null, (get, set) => {
  const projectId = get(mediaProjectIdAtom);
  const buckets = get(mediaUploadQueuesByProjectAtom);
  const queue = buckets[projectId] ?? EMPTY_MEDIA_UPLOADS;
  set(mediaUploadQueuesByProjectAtom, {
    ...buckets,
    [projectId]: queue.filter((item) => (
      item.status === 'queued' || item.status === 'uploading' || item.status === 'processing'
    )),
  });
});
