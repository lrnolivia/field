import { atom } from 'jotai';
import {
  createMediaSession,
  type MediaSession,
  type MediaUploadItem,
} from './media-system';

export const mediaSessionAtom = atom<MediaSession>(createMediaSession());
export const mediaUploadQueueAtom = atom<MediaUploadItem[]>([]);

export const resetMediaSessionAtom = atom(null, (_get, set, next?: Partial<MediaSession>) => {
  set(mediaSessionAtom, createMediaSession(next));
});

export const patchMediaSessionAtom = atom(null, (get, set, patch: Partial<MediaSession>) => {
  const current = get(mediaSessionAtom);
  set(mediaSessionAtom, {
    ...current,
    ...patch,
    route: patch.route ?? current.route,
  });
});

export const upsertMediaUploadAtom = atom(null, (get, set, item: MediaUploadItem) => {
  const queue = get(mediaUploadQueueAtom);
  const index = queue.findIndex((entry) => entry.id === item.id);
  if (index < 0) {
    set(mediaUploadQueueAtom, [...queue, item]);
    return;
  }
  const next = [...queue];
  next[index] = item;
  set(mediaUploadQueueAtom, next);
});


export const removeMediaUploadAtom = atom(null, (get, set, id: string) => {
  set(mediaUploadQueueAtom, get(mediaUploadQueueAtom).filter((item) => item.id !== id));
});

export const clearFinishedMediaUploadsAtom = atom(null, (get, set) => {
  set(
    mediaUploadQueueAtom,
    get(mediaUploadQueueAtom).filter((item) => (
      item.status === 'queued' || item.status === 'uploading' || item.status === 'processing'
    )),
  );
});
