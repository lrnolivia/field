import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

describe('final toolbar and Media consolidation', () => {
  it('uses a quiet active surface plus left-edge accent marker in both tab primitives', () => {
    for (const rel of ['src/editor/ui/ChromeTabBar.tsx', 'src/editor/controls/ToolSegmentedControl.tsx']) {
      const source = read(rel);
      expect(source).toContain('data-active-tab-marker');
      expect(source).toContain('left-[3px]');
      expect(source).toContain('h-4 w-[2px]');
      expect(source).toContain('bg-[var(--bg-active)]');
      expect(source).not.toContain("background: 'var(--accent-surface)'");
    }
  });

  it('keeps the narrow Media panel legible without changing toolbar Media architecture', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const segmented = read('src/editor/controls/ToolSegmentedControl.tsx');
    expect(segmented).toContain("layout?: 'inline' | 'grid'");
    expect(segmented).toContain("'grid grid-cols-2'");
    expect(media).toContain("layout={chrome === 'full' ? 'grid' : 'inline'}");
    expect(media).toContain("data-media-browser-layout={chrome === 'full' ? 'vertical' : 'inline'}");
    expect(media).toContain("'w-full justify-center'");
    expect(media).toContain("'justify-start pt-12'");
  });

  it('keeps Gallery creation compact inside the anchored Media shell', () => {
    const gallery = read('src/editor/gallery/GalleryCreationWizard.tsx');
    expect(gallery).toContain('minHeight: 112');
    expect(gallery).toContain('space-y-3 p-3');
    expect(gallery).toContain('min-h-[92px]');
  });
});
