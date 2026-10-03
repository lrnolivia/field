import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

describe('shared chrome tabs and toolbar-origin popups', () => {
  it('uses one glyph + accent tab language across Inspector and Media pickers', () => {
    const tabs = source('src/editor/ui/ChromeTabBar.tsx');
    const inspector = source('src/editor/controls/InspectorModeTabs.tsx');
    const image = source('src/editor/ui/ImageSearchModal.tsx');
    const video = source('src/editor/ui/VideoSearchModal.tsx');
    const gallery = source('src/editor/gallery/GalleryCreationWizard.tsx');
    expect(tabs).toContain('data-chrome-tabbar');
    expect(tabs).toContain('data-active-tab-marker');
    expect(tabs).toContain('left-[3px]');
    expect(tabs).toContain('bg-[var(--bg-active)]');
    expect(tabs).not.toContain("background: 'var(--accent-surface)'");
    expect(tabs).toContain("color: active ? 'var(--accent)'");
    expect(inspector).not.toContain('<ChromeTabBar');
    expect(inspector).toContain("uiCase('Inspector')");
    expect(image).toContain('<ChromeTabBar');
    expect(video).toContain('<ChromeTabBar');
    expect(gallery).toContain('<ChromeTabBar');
  });

  it('springs toolbar dropdowns and Media surfaces from their toolbar origin', () => {
    const toolbar = source('src/editor/BottomToolbar.tsx');
    const media = source('src/editor/media/MediaToolbarPopover.tsx');
    expect(toolbar).toContain("type: 'spring'");
    expect(toolbar).toContain('data-toolbar-origin-pointer');
    expect(toolbar).toContain("transformOrigin: `calc(50% - ${offset}px) calc(100% + 7px)`");
    expect(media).toContain("type: 'spring'");
    expect(media).toContain('transformOrigin');
    expect(media).toContain('data-media-origin-pointer');
    expect(media).toContain('absolute -bottom-[5px]');
  });

  it('removes dashed upload treatments from the refreshed Media creation flows', () => {
    const image = source('src/editor/ui/ImageSearchModal.tsx');
    const video = source('src/editor/ui/VideoSearchModal.tsx');
    const gallery = source('src/editor/gallery/GalleryCreationWizard.tsx');
    const audio = source('src/editor/media/MediaPanelController.tsx');
    expect(image).toContain('data-media-upload-surface="image"');
    expect(video).toContain('data-media-upload-surface="video"');
    expect(gallery).toContain('data-gallery-empty-state');
    expect(audio).toContain('data-media-audio-picker');
    expect(image).not.toContain('border-2 border-dashed');
    expect(video).not.toContain('border-2 border-dashed');
  });
});
