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

  it('receives lifecycle updates from canvas file drops and the Media browser', () => {
    const canvas = read('src/canvas/CanvasFileDrop.tsx');
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');

    expect(canvas).toContain('upsertMediaUploadAtom');
    expect(canvas).toContain("status: 'queued'");
    expect(canvas).toContain("status: 'uploading'");
    expect(canvas).toContain("status: 'complete'");
    expect(canvas).toContain("status: 'error'");

    expect(browser).toContain('upsertMediaUploadAtom');
    expect(browser).toContain("status: 'queued'");
    expect(browser).toContain("status: 'uploading'");
    expect(browser).toContain("status: 'complete'");
    expect(browser).toContain("status: 'error'");
  });

  it('does not invent percentage progress when the backend exposes no byte progress', () => {
    const canvas = read('src/canvas/CanvasFileDrop.tsx');
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');

    expect(canvas).toContain("status: 'uploading'");
    expect(browser).toContain("status: 'uploading'");
    expect(canvas).toContain('progress: 0');
    expect(browser).toContain('progress: 0');
  });

});
