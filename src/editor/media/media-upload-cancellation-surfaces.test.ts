import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media cancellation surfaces', () => {
  it('treats intentional cancellation as non-error across every ingest origin', () => {
    const paths = [
      'src/editor/media/MediaPanelController.tsx',
      'src/editor/left-toolbar/panels/MediaGalleryPanel.tsx',
      'src/canvas/CanvasFileDrop.tsx',
      'src/editor/ui/ImageSearchModal.tsx',
      'src/editor/ui/VideoSearchModal.tsx',
    ];

    for (const path of paths) {
      const source = read(path);
      expect(source).toContain('isMediaUploadCancelled');
    }
  });

  it('does not surface cancelled uploads as toolbar/picker errors or canvas toasts', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    const canvas = read('src/canvas/CanvasFileDrop.tsx');
    const image = read('src/editor/ui/ImageSearchModal.tsx');
    const video = read('src/editor/ui/VideoSearchModal.tsx');

    expect(controller).toContain('if (isMediaUploadCancelled(error)) return');
    expect(canvas).toContain('if (isMediaUploadCancelled(err))');
    expect(image).toContain('if (!isMediaUploadCancelled(err))');
    expect(video).toContain('if (!isMediaUploadCancelled(error))');
  });

  it('records browser cancellation as an action rather than an error', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(browser).toContain("trace.action('media:upload-cancelled'");
    expect(browser).toContain('if (isMediaUploadCancelled(error)) continue');
  });
});
