import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('canonical Media browser', () => {
  it('offers one All / Images / Video / Audio inventory instead of separate browser silos', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain("type MediaGalleryTab = 'all' | 'images' | 'videos' | 'audio'");
    expect(media).toContain("value: 'all'");
    expect(media).toContain("label: 'All'");
    expect(media).toContain("value: 'audio'");
    expect(media).toContain("label: 'Audio'");
    expect(media).toContain("type BrowserMediaKind = 'image' | 'video' | 'audio' | 'vector'");
    expect(media).toContain('availableUploads');
    expect(media).toContain('kind={item.kind}');
  });

  it('uses the backend inventory contract without coupling the browser to Revyme cloud mode', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('backend.listAssets(projectId)');
    expect(media).toContain('backend.getAssetStorageInfo(projectId)');
    expect(media).toContain('if (assets === null)');
    expect(media).not.toContain('CLOUD_ENABLED');
  });

  it('merges shared session/external Media with durable backend inventory', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('const availableUploads = React.useMemo');
    expect(media).toContain('sessionMediaAssets');
    expect(media).toContain("item.kind === 'audio'");
    expect(media).toContain("item.kind === 'vector'");
    expect(media).toContain('seen.has(item.url)');
  });

  it('lets floating/full Media embed the browser without duplicating sidebar chrome', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(media).toContain("chrome?: 'full' | 'embedded'");
    expect(media).toContain("chrome === 'full'");
    expect(controller).toContain('<MediaGalleryPanel');
    expect(controller).toContain('chrome="embedded"');
    expect(controller).toContain('onPick={pickFromProjectMedia}');
  });
});
