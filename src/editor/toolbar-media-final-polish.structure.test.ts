import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

describe('toolbar and Media final polish', () => {
  it('uses a left-edge active marker instead of a padded accent pill/underline', () => {
    const chrome = read('src/editor/ui/ChromeTabBar.tsx');
    const segmented = read('src/editor/controls/ToolSegmentedControl.tsx');
    for (const source of [chrome, segmented]) {
      expect(source).toContain('data-active-tab-marker');
      expect(source).toContain('left-[3px]');
      expect(source).toContain('h-4 w-[2px]');
      expect(source).not.toContain('bottom-[2px]');
      expect(source).not.toContain("background: 'var(--accent-surface)'");
    }
  });

  it('removes Media from Insert while preserving main-toolbar Media', () => {
    const insert = read('src/editor/left-toolbar/panels/insert/index.tsx');
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(insert).toContain("CATEGORIES.filter((category) => category.id !== 'media')");
    expect(insert).not.toContain('<MediaGalleryPanel');
    expect(toolbar).toContain('<MediaButton />');
    expect(toolbar).toContain('dataTool="media"');
  });

  it('uses mixed compact cards and lists instead of separate list/icon menu modes', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('function MiniMenuCard');
    expect(toolbar).toContain('data-toolbar-mini-card');
    expect(toolbar).not.toContain('function MenuViewToggle');
    expect(toolbar).not.toContain("type MenuView = 'list' | 'icons'");
    expect(toolbar).not.toContain('data-toolbar-menu-tile');
  });

  it('gives the legacy vertical Media surface narrow-layout controls', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const segmented = read('src/editor/controls/ToolSegmentedControl.tsx');
    expect(segmented).toContain("layout?: 'inline' | 'grid'");
    expect(segmented).toContain("'grid grid-cols-2'");
    expect(media).toContain("layout={chrome === 'full' ? 'grid' : 'inline'}");
    expect(media).toContain("data-media-browser-layout={chrome === 'full' ? 'vertical' : 'inline'}");
  });

  it('gives compact upload flows more usable popup room without oversized drop cards', () => {
    const popover = read('src/editor/media/MediaToolbarPopover.tsx');
    const image = read('src/editor/ui/ImageSearchModal.tsx');
    const video = read('src/editor/ui/VideoSearchModal.tsx');
    expect(popover).toContain("compact ? 224 : 520");
    expect(popover).toContain("min(660px, calc(100vh - 88px))");
    expect(image).toContain('col-span-3 h-28');
    expect(video).toContain('flex-shrink-0 h-28');
  });
});
