import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media operation retry plumbing', () => {
  it('retains the file and higher-level success continuation behind the same upload id', () => {
    const ingest = read('src/editor/media/media-ingest.ts');
    expect(ingest).toContain('const retryMediaUploads = new Map');
    expect(ingest).toContain('uploadId: providedUploadId');
    expect(ingest).toContain('const uploadId = providedUploadId ?? uniqueUploadId');
    expect(ingest).toContain('onSuccess?.(result, { isRetry })');
    expect(ingest).toContain('retryable: retryable && retryMediaUploads.has(uploadId)');
  });

  it('retries only error/cancelled items in the active project', () => {
    const state = read('src/editor/media/media-state.ts');
    expect(state).toContain('export const retryMediaUploadAtom');
    expect(state).toContain("item.status !== 'error' && item.status !== 'cancelled'");
    expect(state).toContain('const projectId = get(mediaProjectIdAtom)');
    expect(state).toContain('await retryMediaUpload(id)');
  });

  it('does not let remove hide work that is still active', () => {
    const state = read('src/editor/media/media-state.ts');
    expect(state).toContain('"Remove" on active work means cancel first');
    expect(state).toContain('cancelMediaUpload(id)');
    expect(state).toContain('discardMediaUploadRetry(id)');
  });

  it('replays toolbar placement captured before the original upload', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(controller).toContain('const placement = resolvePlacement(elementKind)');
    expect(controller).toContain('else placeUrl(elementKind, result.url, placement)');
    expect(controller).toContain('setPendingPlacement({ kind: elementKind, url: result.url, placement })');
    expect(controller).toContain('if (portrait && !alive.current) return;');
  });

  it('replays canvas-drop geometry captured before the original upload', () => {
    const canvas = read('src/canvas/CanvasFileDrop.tsx');
    expect(canvas).toContain('const targetX = canvasX + xOffset');
    expect(canvas).toContain('queueImageFrame(result.url, dims, targetX, canvasY)');
    expect(canvas).toContain('if (context.isRetry)');
  });

  it('does not globally replay contextual picker callbacks after those contexts close', () => {
    const image = read('src/editor/ui/ImageSearchModal.tsx');
    const video = read('src/editor/ui/VideoSearchModal.tsx');
    expect(image).toContain('retryable: false');
    expect(video).toContain('retryable: false');
  });
});

