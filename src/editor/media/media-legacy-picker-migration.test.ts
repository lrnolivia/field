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
    expect(host).toContain("panel.kind === 'media-gallery'");
  });

  it('keeps the generic media-gallery compatibility panel until its callers are separately proven dead', () => {
    const store = read('src/editor/toolbar-panel-store.ts');
    const host = read('src/editor/ToolbarPanelHost.tsx');
    expect(store).toContain("kind: 'media-gallery'");
    expect(host).toContain("panel.kind === 'media-gallery'");
    expect(host).toContain('<MediaGalleryPanel />');
  });
});
