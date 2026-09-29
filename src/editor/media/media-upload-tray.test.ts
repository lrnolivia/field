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
});
