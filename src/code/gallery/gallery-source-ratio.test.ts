import { describe, expect, it, vi } from 'vitest';
import { measureGallerySourceRatio } from './gallery-source-ratio';

describe('measureGallerySourceRatio', () => {
  it('returns null when image APIs are unavailable', async () => {
    const previous = globalThis.Image;
    // @ts-expect-error test removes the browser Image constructor.
    delete globalThis.Image;
    await expect(measureGallerySourceRatio('https://example.com/a.jpg')).resolves.toBeNull();
    globalThis.Image = previous;
  });

  it('is shared by GalleryTool and toolbar Gallery creation', async () => {
    const fs = await import('node:fs');
    const tool = fs.readFileSync('src/editor/tools/GalleryTool.tsx', 'utf8');
    const controller = fs.readFileSync('src/editor/media/MediaPanelController.tsx', 'utf8');

    expect(tool).toContain("import { measureGallerySourceRatio } from '@/code/gallery/gallery-source-ratio'");
    expect(controller).toContain("import { measureGallerySourceRatio } from '@/code/gallery/gallery-source-ratio'");
    expect(tool).not.toContain('function measureGallerySourceRatio(');
    expect(controller).toContain('config.mediaUrls.map(measureGallerySourceRatio)');
  });

  it('keeps one deterministic timeout contract', async () => {
    const source = (await import('node:fs')).readFileSync(
      'src/code/gallery/gallery-source-ratio.ts',
      'utf8',
    );
    expect(source).toContain('DEFAULT_GALLERY_RATIO_TIMEOUT_MS = 8000');
    expect(source).toContain("image.src = ''");
    expect(source).toContain('if (image.complete && image.naturalWidth > 0');
  });
});
