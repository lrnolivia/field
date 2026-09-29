import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media upload tray', () => {
  it('mounts once at the global editor overlay level and stays out of Preview', () => {
    const app = read('src/App.tsx');
    expect(app).toContain("import MediaUploadTray from './editor/media/MediaUploadTray'");
    expect(app).toContain('{!previewMode && <MediaUploadTray />}');
  });

  it('uses the approved compact lower-right queue instead of a success modal', () => {
    const tray = read('src/editor/media/MediaUploadTray.tsx');
    expect(tray).toContain('w-[320px]');
    expect(tray).toContain('bottom-[72px] right-4');
    expect(tray).toContain('min-h-11');
    expect(tray).toContain('h-[2px]');
    expect(tray).toContain('1400');
    expect(tray).toContain('aria-live="polite"');
    expect(tray).not.toContain('<Modal');
    expect(tray).not.toContain('confetti');
  });

  it('keeps active uploads while finished queue rows can be cleared', () => {
    const state = read('src/editor/media/media-state.ts');
    expect(state).toContain('clearFinishedMediaUploadsAtom');
    expect(state).toContain("item.status === 'queued'");
    expect(state).toContain("item.status === 'uploading'");
    expect(state).toContain("item.status === 'processing'");
    expect(state).toContain('removeMediaUploadAtom');
  });

  it('receives lifecycle updates through one shared Media ingest service', () => {
    const canvas = read('src/canvas/CanvasFileDrop.tsx');
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const toolbar = read('src/editor/media/MediaPanelController.tsx');
    const ingest = read('src/editor/media/media-ingest.ts');

    expect(canvas).toContain('ingestMediaFile');
    expect(browser).toContain('ingestMediaFile');
    expect(toolbar).toContain('ingestMediaFile');

    expect(ingest).toContain("status: 'queued'");
    expect(ingest).toContain("status: 'processing'");
    expect(ingest).toContain("status: 'uploading'");
    expect(ingest).toContain("status: 'complete'");
    expect(ingest).toContain("status: 'error'");
  });

  it('does not invent percentage progress when the backend exposes no byte progress', () => {
    const ingest = read('src/editor/media/media-ingest.ts');
    expect(ingest).toContain("status: 'uploading'");
    expect(ingest).toContain('progress: 0');
    expect(ingest).not.toContain('loaded / total');
  });


  it('makes the canonical Media browser batch-capable while keeping toolbar Upload single-item', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const toolbar = read('src/editor/media/MediaPanelController.tsx');

    expect(browser).toContain('const files = Array.from(input.files ?? [])');
    expect(browser).toContain('for (const [index, file] of files.entries())');
    expect(browser).toContain('multiple');
    expect(browser).toContain('batchSize: files.length');
    expect(browser).toContain('more skipped');

    const toolbarUpload = toolbar.slice(
      toolbar.indexOf('ref={uploadInputRef}'),
      toolbar.indexOf('<MediaToolbarPopover', toolbar.indexOf('ref={uploadInputRef}')),
    );
    expect(toolbarUpload).not.toContain('multiple');
    expect(toolbarUpload).toContain('files?.[0]');
  });

});
