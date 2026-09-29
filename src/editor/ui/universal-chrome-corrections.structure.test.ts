import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

describe('universal inspector/media chrome corrections', () => {
  it('keeps active tab indicators inside buttons across both tab primitives', () => {
    const chrome = read('src/editor/ui/ChromeTabBar.tsx');
    const segmented = read('src/editor/controls/ToolSegmentedControl.tsx');
    expect(chrome).toContain('bottom-[2px]');
    expect(chrome).not.toContain('-bottom-[2px]');
    expect(segmented).toContain('bottom-[2px]');
    expect(segmented).toContain("background: 'var(--accent-surface)'");
    expect(segmented).not.toContain('useLayoutEffect');
  });

  it('gives Media kind tabs glyphs through the universal segmented style', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain("label: 'All'");
    expect(media).toContain("label: 'Images'");
    expect(media).toContain("label: 'Videos'");
    expect(media).toContain('icon: <svg');
  });

  it('renders the Media origin pointer outside the clipped surface and removes sheet sliding', () => {
    const popover = read('src/editor/media/MediaToolbarPopover.tsx');
    expect(popover).toContain('data-media-toolbar-surface');
    expect(popover).toContain('data-media-origin-pointer');
    expect(popover).toContain('overflow-visible');
    expect(popover).not.toContain('transition-[left,bottom,width,max-height]');
  });

  it('moves padding side labels and rotate glyphs inside their fields', () => {
    const input = read('src/editor/controls/ToolInput.tsx');
    const padding = read('src/editor/tools/LayoutPaddingControl.tsx');
    const rotate = read('src/editor/tools/StylesTool/atoms/RotateControl.tsx');
    expect(input).toContain('leadingGlyph?: ReactNode');
    expect(input).toContain('leadingLabel?: string');
    expect(padding).toContain('leadingLabel={label}');
    expect(padding).not.toContain('chevronLabel={label}');
    expect(padding).toContain('data-layout-padding-editor className="w-full"');
    expect(rotate).toContain('leadingGlyph={');
    expect(rotate).not.toContain('grid-cols-[22px_minmax(0,1fr)]');
  });
});
