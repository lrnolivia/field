import { backend } from '@/backend';
import { getProjectId } from '@/backend/project-id';
import type { MediaAsset, MediaKind, MediaUploadItem } from './media-system';

const MAX_SESSION_HASH_BYTES = 64 * 1024 * 1024;

export type MediaQueueWriter = (item: MediaUploadItem) => void;
export type MediaAssetWriter = (asset: MediaAsset) => void;

interface SessionMediaIdentity {
  url: string;
  contentHash: string;
}

const sessionMediaIdentity = new Map<string, SessionMediaIdentity>();

interface ActiveMediaUpload {
  controller: AbortController;
}

const activeMediaUploads = new Map<string, ActiveMediaUpload>();

export interface MediaIngestSuccessContext {
  isRetry: boolean;
}

export type MediaIngestSuccessHandler = (
  result: MediaIngestResult,
  context: MediaIngestSuccessContext,
) => void | Promise<void>;

interface RetryMediaUploadOperation {
  projectId: string;
  run: () => Promise<MediaIngestResult>;
}

const retryMediaUploads = new Map<string, RetryMediaUploadOperation>();


export class MediaUploadCancelledError extends Error {
  readonly uploadId: string;

  constructor(uploadId: string) {
    super('Upload cancelled');
    this.name = 'MediaUploadCancelledError';
    this.uploadId = uploadId;
  }
}

export function isMediaUploadCancelled(error: unknown): error is MediaUploadCancelledError {
  return error instanceof MediaUploadCancelledError
    || (error instanceof DOMException && error.name === 'AbortError');
}

export function cancelMediaUpload(uploadId: string): boolean {
  const active = activeMediaUploads.get(uploadId);
  if (!active) return false;
  active.controller.abort();
  return true;
}

export async function retryMediaUpload(uploadId: string): Promise<MediaIngestResult | null> {
  if (activeMediaUploads.has(uploadId)) return null;
  const operation = retryMediaUploads.get(uploadId);
  return operation ? operation.run() : null;
}

export function discardMediaUploadRetry(uploadId: string): void {
  retryMediaUploads.delete(uploadId);
}


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


export function mediaAssetFromExternalUrl(
  url: string,
  kind: Exclude<MediaKind, 'all'>,
  source: MediaAsset['source'] = 'external',
  projectId: string = getProjectId(),
): MediaAsset {
  let name = kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : 'Image';
  try {
    const part = new URL(url).pathname.split('/').filter(Boolean).pop();
    if (part) name = decodeURIComponent(part);
  } catch {
    // Keep the generic kind label for data/blob/custom schemes.
  }

  return {
    id: 'external:' + kind + ':' + url,
    projectId,
    url,
    kind,
    name,
    source,
    createdAt: new Date().toISOString(),
  };
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
  rememberAsset,
  signal,
  uploadId: providedUploadId,
  retryable = true,
  onSuccess,
}: {
  file: File;
  projectId: string;
  kind: Exclude<MediaKind, 'all' | 'embed'>;
  upsert: MediaQueueWriter;
  idPrefix?: string;
  allowDuplicate?: boolean;
  rememberAsset?: MediaAssetWriter;
  signal?: AbortSignal;
  /** Internal/public replay hook: retry keeps the same queue identity. */
  uploadId?: string;
  /** Disable when replaying the original higher-level context would be unsafe. */
  retryable?: boolean;
  /** Runs before completion is committed, so continuation failures are retryable too. */
  onSuccess?: MediaIngestSuccessHandler;
}): Promise<MediaIngestResult> {
  const uploadId = providedUploadId ?? uniqueUploadId(idPrefix, file);
  const isRetry = providedUploadId !== undefined;

  if (retryable) {
    retryMediaUploads.set(uploadId, {
      projectId,
      run: () => ingestMediaFile({
        file,
        projectId,
        kind,
        upsert,
        idPrefix,
        allowDuplicate,
        rememberAsset,
        uploadId,
        retryable,
        onSuccess,
      }),
    });
  } else {
    retryMediaUploads.delete(uploadId);
  }
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();

  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });

  activeMediaUploads.set(uploadId, { controller });

  upsert({
    id: uploadId,
    projectId,
    name: file.name,
    kind,
    status: 'queued',
    progress: 0,
  });

  let contentHash: string | null = null;
  try {
    upsert({
      id: uploadId,
      projectId,
      name: file.name,
      kind,
      status: 'processing',
      progress: 0,
    });

    if (controller.signal.aborted) throw new MediaUploadCancelledError(uploadId);
    contentHash = await hashMediaFile(file);
    if (controller.signal.aborted) throw new MediaUploadCancelledError(uploadId);
    if (contentHash && !allowDuplicate) {
      const existing = sessionMediaIdentity.get(identityKey(projectId, contentHash));
      if (existing) {
        const result: MediaIngestResult = {
          url: existing.url,
          contentHash,
          reusedExisting: true,
          uploadId,
        };
        await onSuccess?.(result, { isRetry });
        retryMediaUploads.delete(uploadId);
        upsert({
          id: uploadId,
          projectId,
          name: file.name,
          kind,
          status: 'complete',
          progress: 1,
          assetId: existing.url,
          contentHash,
          reusedExisting: true,
          retryable: false,
        });
        return result;
      }
    }

    upsert({
      id: uploadId,
      projectId,
      name: file.name,
      kind,
      status: 'uploading',
      progress: 0,
      contentHash: contentHash ?? undefined,
    });

    const url = await backend.uploadAsset(projectId, file, { signal: controller.signal });
    if (contentHash) {
      sessionMediaIdentity.set(identityKey(projectId, contentHash), {
        url,
        contentHash,
      });
    }

    rememberAsset?.({
      id: allowDuplicate ? url : contentHash ?? url,
      projectId,
      url,
      kind,
      name: file.name,
      mimeType: file.type || undefined,
      size: file.size,
      source: 'upload',
      contentHash: contentHash ?? undefined,
      createdAt: new Date().toISOString(),
    });

    const result: MediaIngestResult = {
      url,
      contentHash,
      reusedExisting: false,
      uploadId,
    };
    await onSuccess?.(result, { isRetry });
    retryMediaUploads.delete(uploadId);

    upsert({
      id: uploadId,
      projectId,
      name: file.name,
      kind,
      status: 'complete',
      progress: 1,
      assetId: url,
      contentHash: contentHash ?? undefined,
      retryable: false,
    });

    return result;
  } catch (error) {
    if (controller.signal.aborted || isMediaUploadCancelled(error)) {
      upsert({
        id: uploadId,
        projectId,
        name: file.name,
        kind,
        status: 'cancelled',
        progress: 0,
        contentHash: contentHash ?? undefined,
        retryable: retryable && retryMediaUploads.has(uploadId),
      });
      throw error instanceof MediaUploadCancelledError
        ? error
        : new MediaUploadCancelledError(uploadId);
    }

    const message = error instanceof Error ? error.message : 'Upload failed';
    upsert({
      id: uploadId,
      projectId,
      name: file.name,
      kind,
      status: 'error',
      progress: 0,
      error: message,
      contentHash: contentHash ?? undefined,
      retryable: retryable && retryMediaUploads.has(uploadId),
    });
    throw error;
  } finally {
    signal?.removeEventListener('abort', abortFromCaller);
    const active = activeMediaUploads.get(uploadId);
    if (active?.controller === controller) activeMediaUploads.delete(uploadId);
  }
}

export function clearSessionMediaIdentityForTests(): void {
  sessionMediaIdentity.clear();
  for (const active of activeMediaUploads.values()) active.controller.abort();
  activeMediaUploads.clear();
  retryMediaUploads.clear();
}
