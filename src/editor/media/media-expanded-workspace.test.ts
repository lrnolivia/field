import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('expanded Media workspace', () => {
  it('adds workspace density and details only to expanded toolbar Media', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const controller = read('src/editor/media/MediaPanelController.tsx');

    expect(browser).toContain('workspace?: boolean');
    expect(browser).toContain('workspace ? "grid grid-cols-4 gap-2"');
    expect(browser).toContain('data-media-details');
    expect(controller).toContain('workspace={expanded}');
    expect(controller).not.toContain('<MediaGalleryPanel chrome="embedded" workspace />');
  });

  it('shows only metadata the current Media model actually supplies', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(browser).toContain('Filename');
    expect(browser).toContain('File size');
    expect(browser).toContain('Source');
    expect(browser).toContain('Modified');
    expect(browser).toContain('Project media');
    expect(browser).toContain('Session');
    expect(browser).not.toContain('Used in');
    expect(browser).not.toContain('Alt text');
    expect(browser).not.toContain('Provenance');
  });

  it('keeps destructive management gated to durable project assets', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(browser).toContain("durableInventory === true && inspectedAsset.key");
    expect(browser).toContain('Delete asset');
  });
});
