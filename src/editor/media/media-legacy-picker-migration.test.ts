import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media legacy picker migration', () => {
  it('routes Frame → Image into canonical toolbar Media', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('const openImageMedia = useCallback');
    expect(toolbar).toContain("route: { view: 'browser', kind: 'image' }");
    expect(toolbar).toContain("intent: 'insert'");
    expect(toolbar).toContain("setToolbarPanel({ kind: 'media' })");
    expect(toolbar).not.toContain("kind: 'media-picker'");
  });

  it('removes the old toolbar picker panel kinds after replacement coverage exists', () => {
    const store = read('src/editor/toolbar-panel-store.ts');
    const host = read('src/editor/ToolbarPanelHost.tsx');

    for (const legacy of ['media-picker', 'gallery-picker', 'audio-picker']) {
      expect(store).not.toContain(legacy);
      expect(host).not.toContain(legacy);
    }

    expect(host).not.toContain("import ImageSearchModal");
    expect(host).not.toContain("import VideoSearchModal");
    expect(host).not.toContain('backend.uploadAsset');
    expect(host).toContain("panel.kind === 'media'");
    expect(host).not.toContain("media-gallery");
  });

  it('removes the generic media-gallery compatibility panel after proving there are no live callers', () => {
    const store = read('src/editor/toolbar-panel-store.ts');
    const host = read('src/editor/ToolbarPanelHost.tsx');
    const toolbar = read('src/editor/BottomToolbar.tsx');
    const leftMenu = read('src/editor/left-toolbar/LeftMenu.tsx');
    const leftPanel = read('src/editor/left-toolbar/LeftPanel.tsx');
    const controller = read('src/editor/media/MediaPanelController.tsx');

    for (const source of [store, host, toolbar, leftMenu, leftPanel, controller]) {
      expect(source).not.toContain('media-gallery');
    }
    expect(host).not.toContain('MediaGalleryPanel');
  });
});
