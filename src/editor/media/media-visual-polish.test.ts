import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media visual polish architecture', () => {
  it('preserves the anchored launcher → expandable same-shell architecture', () => {
    const popover = read('src/editor/media/MediaToolbarPopover.tsx');
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(popover).toContain('data-media-toolbar-popover');
    expect(popover).toContain("data-media-popover-density={expanded ? 'expanded'");
    expect(controller).toContain('expanded={expanded}');
    expect(controller).toContain('onExpand={() => setExpanded((value) => !value)}');
    expect(controller).not.toContain("import Modal from '@/design-system/Modal'");
  });

  it('keeps one canonical Media browser shared by sidebar and toolbar surfaces', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    const insert = read('src/editor/left-toolbar/panels/insert/index.tsx');
    expect(controller).toContain('<MediaGalleryPanel chrome="embedded" workspace={expanded} />');
    expect(insert).toContain('<MediaGalleryPanel />');
  });

  it('keeps the upload tray lightweight and independent', () => {
    const tray = read('src/editor/media/MediaUploadTray.tsx');
    expect(tray).toContain('bottom-[72px] right-4');
    expect(tray).toContain('w-[320px]');
    expect(tray).not.toContain('<Modal');
    expect(tray).not.toContain('fixed inset-0');
  });
});
