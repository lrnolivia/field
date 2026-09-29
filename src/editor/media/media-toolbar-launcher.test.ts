import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('toolbar Media launcher contract', () => {
  it('uses a single Media button and an anchored launcher instead of the legacy dropdown', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('function MediaButton()');
    expect(toolbar).toContain('dataTool="media"');
    expect(toolbar).toContain("setPanel({ kind: 'media' })");
    expect(toolbar).not.toContain('function MediaDropdown(');
  });

  it('keeps compact Media chrome anchored, expandable, and close-button free', () => {
    const popover = read('src/editor/media/MediaToolbarPopover.tsx');
    expect(popover).toContain('data-toolbar-tool="media"');
    expect(popover).toContain('requestedWidth = expanded ? 840 : compact ? 224 : 480');
    expect(popover).toContain("data-media-popover-density={expanded ? 'expanded'");
    expect(popover).toContain("height: expanded ? 'min(720px, calc(100vh - 112px))'");
    expect(popover).toContain("expanded ? 'Collapse' : 'Expand'");
    expect(popover).not.toContain('ModalCloseButton');
    expect(popover).not.toContain('>Expand</button>');
    const launcher = read('src/editor/media/MediaLauncher.tsx');
    expect(launcher).toContain('data-media-launcher-featured');
    expect(launcher).toContain('Browse media');
    expect(launcher).toContain('grid grid-cols-2 gap-1.5');
  });

  it('expands the same Media shell without swapping to a second modal', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(controller).toContain('expanded={expanded}');
    expect(controller).toContain('onExpand={() => setExpanded((value) => !value)}');
    expect(controller).toContain('embedded');
    expect(controller).not.toContain("import Modal from '@/design-system/Modal'");
    expect(controller).not.toContain('if (expanded) {');
  });

  it('keeps sidebar Media and toolbar Media as separate invocation surfaces', () => {
    const insert = read('src/editor/left-toolbar/panels/insert/index.tsx');
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(insert).toContain("if (category.id === 'media')");
    expect(insert).toContain('<MediaGalleryPanel />');
    expect(controller).not.toContain('leftPanelAtom');
    expect(controller).not.toContain("openRailPanel('media')");
  });

  it('keeps Gallery an image composition intent instead of a media kind', () => {
    const system = read('src/editor/media/media-system.ts');
    expect(system).toContain("return { view: 'create', kind: 'image', provider: 'gallery' }");
    expect(system).toContain("action === 'gallery' ? 'gallery'");
  });
});
