import { backend } from '@/backend';
import type { MediaKind, MediaUploadItem } from './media-system';

const MAX_SESSION_HASH_BYTES = 64 * 1024 * 1024;

export type MediaQueueWriter = (item: MediaUploadItem) => void;

interface SessionMediaIdentity {
  url: string;
  contentHash: string;
}

const sessionMediaIdentity = new Map<string, SessionMediaIdentity>();

function identityKey(projectId: string, contentHash: string): string {
  return projectId + ':' + contentHash;
}

function uniqueUploadId(prefix: string, file: File): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  return prefix + '-' + token + '-' + file.name;
}

export async function hashMediaFile(file: File): Promise<string | null> {
  if (file.size > MAX_SESSION_HASH_BYTES) return null;
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;

  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface MediaIngestResult {
  url: string;
  contentHash: string | null;
  reusedExisting: boolean;
  uploadId: string;
}

export async function ingestMediaFile({
  file,
  projectId,
  kind,
  upsert,
  idPrefix = 'media',
  allowDuplicate = false,
}: {
  file: File;
  projectId: string;
  kind: Exclude<MediaKind, 'all' | 'embed'>;
  upsert: MediaQueueWriter;
  idPrefix?: string;
  allowDuplicate?: boolean;
}): Promise<MediaIngestResult> {
  const uploadId = uniqueUploadId(idPrefix, file);

  upsert({
    id: uploadId,
    name: file.name,
    kind,
    status: 'queued',
    progress: 0,
  });

  let contentHash: string | null = null;
  try {
    upsert({
      id: uploadId,
      name: file.name,
      kind,
      status: 'processing',
      progress: 0,
    });

    contentHash = await hashMediaFile(file);
    if (contentHash && !allowDuplicate) {
      const existing = sessionMediaIdentity.get(identityKey(projectId, contentHash));
      if (existing) {
        upsert({
          id: uploadId,
          name: file.name,
          kind,
          status: 'complete',
          progress: 1,
          assetId: existing.url,
          contentHash,
          reusedExisting: true,
        });
        return {
          url: existing.url,
          contentHash,
          reusedExisting: true,
          uploadId,
        };
      }
    }

    upsert({
      id: uploadId,
      name: file.name,
      kind,
      status: 'uploading',
      progress: 0,
      contentHash: contentHash ?? undefined,
    });

    const url = await backend.uploadAsset(projectId, file);
    if (contentHash) {
      sessionMediaIdentity.set(identityKey(projectId, contentHash), {
        url,
        contentHash,
      });
    }

    upsert({
      id: uploadId,
      name: file.name,
      kind,
      status: 'complete',
      progress: 1,
      assetId: url,
      contentHash: contentHash ?? undefined,
    });

    return {
      url,
      contentHash,
      reusedExisting: false,
      uploadId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    upsert({
      id: uploadId,
      name: file.name,
      kind,
      status: 'error',
      progress: 0,
      error: message,
      contentHash: contentHash ?? undefined,
    });
    throw error;
  }
}

export function clearSessionMediaIdentityForTests(): void {
  sessionMediaIdentity.clear();
}
