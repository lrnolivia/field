import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('expanded Media workspace', () => {
  it('adds workspace density and details only to expanded toolbar Media', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const controller = read('src/editor/media/MediaPanelController.tsx');

    expect(browser).toContain('workspace?: boolean');
    expect(browser).toContain('workspace ? "grid grid-cols-3 gap-2.5"');
    expect(browser).toContain('data-media-details');
    expect(browser).toContain('data-media-viewer-stage');
    expect(browser).toContain('object-contain');
    expect(browser).toContain('w-[274px]');
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

  it('adds truthful Source and Sort controls only to the expanded workspace', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(browser).toContain('data-media-workspace-controls');
    expect(browser).toContain("sourceFilter");
    expect(browser).toContain("sortOrder");
    expect(browser).toContain('<option value="upload">Uploaded</option>');
    expect(browser).toContain('<option value="external">External</option>');
    expect(browser).toContain('<option value="newest">Newest</option>');
    expect(browser).toContain('<option value="oldest">Oldest</option>');
    expect(browser).toContain('<option value="name">Name</option>');
    expect(browser).toContain('workspace && (');
  });

  it('does not invent a Usage filter before relationship data exists', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(browser).not.toContain('data-media-usage-filter');
    expect(browser).not.toContain('Used in');
  });

  it('preserves explicit external/upload source metadata in the details rail', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(browser).toContain("inspectedAsset.source === 'external'");
    expect(browser).toContain("inspectedAsset.source === 'upload'");
    expect(browser).toContain("'External'");
    expect(browser).toContain("'Uploaded'");
  });

});
