import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media cancellation state actions', () => {
  it('exposes project-aware cancel-one and cancel-all write atoms', () => {
    const state = read('src/editor/media/media-state.ts');

    expect(state).toContain('export const cancelMediaUploadAtom');
    expect(state).toContain('export const cancelAllActiveMediaUploadsAtom');
    expect(state).toContain('const projectId = get(mediaProjectIdAtom)');
    expect(state).toContain('cancelMediaUpload(item.id)');
  });

  it('only allows active queue states to cancel', () => {
    const state = read('src/editor/media/media-state.ts');

    expect(state).toContain("item.status !== 'queued'");
    expect(state).toContain("item.status !== 'uploading'");
    expect(state).toContain("item.status !== 'processing'");
    expect(state).not.toContain("item.status === 'complete' && cancelMediaUpload");
  });
});
