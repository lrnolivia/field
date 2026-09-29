import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('canonical Media browser', () => {
  it('offers one All / Images / Videos inventory instead of separate browser silos', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain("type MediaGalleryTab = 'all' | 'images' | 'videos'");
    expect(media).toContain("{ value: 'all', label: 'All' }");
    expect(media).toContain("? ['image', 'video']");
    expect(media).toContain("merged.push({ ...item, kind })");
    expect(media).toContain('kind={item.kind}');
  });

  it('does not erase standalone uploads when the user changes Media filters', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('if (isCloud) setUploads([])');
    expect(media).toContain("setUploads(prev => [{ url, size: file.size, kind }, ...prev])");
  });

  it('lets floating/full Media embed the browser without duplicating sidebar chrome', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(media).toContain("chrome?: 'full' | 'embedded'");
    expect(media).toContain("chrome === 'full'");
    expect(controller).toContain('<MediaGalleryPanel chrome="embedded" />');
  });
});
