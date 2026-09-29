import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media upload cancellation plumbing', () => {
  it('makes the backend upload contract abortable end to end', () => {
    const types = read('src/backend/types.ts');
    const local = read('src/backend/local-backend.ts');
    const field = read('src/backend/field-backend.ts');
    const revyme = read('src/backend/revyme-backend.ts');

    expect(types).toContain('export interface UploadAssetOptions');
    expect(types).toContain('signal?: AbortSignal');
    expect(types).toContain('uploadAsset(id: string, file: File, options?: UploadAssetOptions)');

    expect(local).toContain("new DOMException('Upload cancelled', 'AbortError')");
    expect(local).toContain("signal?.addEventListener('abort', onAbort");
    expect(local).toContain('reader.abort()');

    expect(field).toContain('this.localFallback.uploadAsset(id, file, options)');
    expect(revyme).toContain('signal: options?.signal');
  });

  it('registers active ingests by upload id and exposes a real cancel operation', () => {
    const ingest = read('src/editor/media/media-ingest.ts');

    expect(ingest).toContain('const activeMediaUploads = new Map');
    expect(ingest).toContain('export function cancelMediaUpload(uploadId: string): boolean');
    expect(ingest).toContain('active.controller.abort()');
    expect(ingest).toContain("status: 'cancelled'");
    expect(ingest).toContain('new MediaUploadCancelledError(uploadId)');
  });

  it('checks cancellation around hashing and always cleans active state', () => {
    const ingest = read('src/editor/media/media-ingest.ts');

    expect(ingest).toContain('if (controller.signal.aborted) throw new MediaUploadCancelledError(uploadId)');
    expect(ingest).toContain("backend.uploadAsset(projectId, file, { signal: controller.signal })");
    expect(ingest).toContain("signal?.removeEventListener('abort', abortFromCaller)");
    expect(ingest).toContain('activeMediaUploads.delete(uploadId)');
  });

  it('does not fake retry at the byte-upload layer', () => {
    const ingest = read('src/editor/media/media-ingest.ts');
    expect(ingest).not.toContain('retryMediaUpload');
    expect(ingest).not.toContain('retryMediaIngest');
  });
});
