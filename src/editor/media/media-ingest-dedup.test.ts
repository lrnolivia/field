import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media exact-content session identity', () => {
  it('hashes supported files with SHA-256 and scopes identity by project', () => {
    const ingest = read('src/editor/media/media-ingest.ts');
    expect(ingest).toContain("crypto.subtle.digest('SHA-256'");
    expect(ingest).toContain("projectId + ':' + contentHash");
    expect(ingest).toContain('sessionMediaIdentity');
    expect(ingest).toContain('64 * 1024 * 1024');
  });

  it('reuses an existing exact-content identity unless duplication is explicitly allowed', () => {
    const ingest = read('src/editor/media/media-ingest.ts');
    expect(ingest).toContain('!allowDuplicate');
    expect(ingest).toContain('reusedExisting: true');
    expect(ingest).toContain('assetId: existing.url');
    expect(ingest).toContain('contentHash');
  });

  it('surfaces exact-content reuse in the upload tray instead of claiming another upload', () => {
    const tray = read('src/editor/media/MediaUploadTray.tsx');
    const types = read('src/editor/media/media-system.ts');
    expect(types).toContain('reusedExisting?: boolean');
    expect(types).toContain('contentHash?: string');
    expect(tray).toContain('Already in Media · using existing');
    expect(tray).toContain("' reused'");
  });
});
