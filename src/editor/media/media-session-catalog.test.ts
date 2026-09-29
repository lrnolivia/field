import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('shared session Media catalog', () => {
  it('is separate from transient upload history', () => {
    const state = read('src/editor/media/media-state.ts');
    expect(state).toContain('sessionMediaAssetsAtom');
    expect(state).toContain('upsertSessionMediaAssetAtom');
    expect(state).toContain('removeSessionMediaAssetAtom');

    const clearStart = state.indexOf('clearFinishedMediaUploadsAtom');
    const clearSlice = state.slice(clearStart);
    expect(clearSlice).not.toContain('sessionMediaAssetsAtom');
  });

  it('registers completed ingest into the shared catalog', () => {
    const ingest = read('src/editor/media/media-ingest.ts');
    expect(ingest).toContain('rememberAsset?: MediaAssetWriter');
    expect(ingest).toContain('rememberAsset?.({');
    expect(ingest).toContain("source: 'upload'");
    expect(ingest).toContain('contentHash: contentHash ?? undefined');
  });

  it('uses the shared catalog from toolbar, canvas, and canonical Media browser', () => {
    const toolbar = read('src/editor/media/MediaPanelController.tsx');
    const canvas = read('src/canvas/CanvasFileDrop.tsx');
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');

    expect(toolbar).toContain('upsertSessionMediaAssetAtom');
    expect(toolbar).toContain('rememberAsset');

    expect(canvas).toContain('upsertSessionMediaAssetAtom');
    expect(canvas).toContain('rememberAsset: rememberMediaAsset');

    expect(browser).toContain('sessionMediaAssetsAtom');
    expect(browser).toContain('upsertSessionMediaAssetAtom');
    expect(browser).toContain('rememberAsset: rememberMediaAsset');
  });

  it('mirrors shared session assets only when the backend has no durable catalog', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(browser).toContain('if (durableInventory !== false) return');
    expect(browser).toContain("item.kind === 'image' || item.kind === 'video'");
    expect(browser).toContain('lastModified: item.createdAt');
  });
});
