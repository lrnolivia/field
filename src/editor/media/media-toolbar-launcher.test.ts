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
    const glyph = read('src/editor/media/MediaGlyph.tsx');
    expect(glyph).toContain('data-media-glyph="library"');
    expect(glyph).not.toContain('<circle');
    expect(glyph).not.toContain('m3.5 9.25');
  });

  it('keeps compact Media chrome anchored, expandable, and close-button free', () => {
    const popover = read('src/editor/media/MediaToolbarPopover.tsx');
    expect(popover).toContain('data-toolbar-tool="media"');
    expect(popover).toContain('requestedWidth = expanded ? 840 : compact ? 224 : 560');
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

  it('keeps Media toolbar-only instead of duplicating it inside Insert', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    const insert = read('src/editor/left-toolbar/panels/insert/index.tsx');
    const insertData = read('src/shared/insert-items/element-data.ts');
    expect(toolbar).toContain('function MediaButton()');
    expect(toolbar).toContain('<MediaButton />');
    expect(toolbar).toContain('dataTool="media"');
    expect(insert).toContain('const FIELD_INSERT_CATEGORIES: InsertCategory[] = CATEGORIES;');
    expect(insert).not.toContain("category.id !== 'media'");
    expect(insert).not.toContain("if (category.id === 'media')");
    expect(insert).not.toContain('MediaGalleryPanel');
    expect(insert).not.toContain('MediaGlyph');
    expect(insertData).not.toContain('const MEDIA_ITEMS');
    expect(insertData).not.toContain("id: 'media'");
    expect(insertData).not.toContain("id: 'media-library'");
  });

  it('keeps Gallery an image composition intent instead of a media kind', () => {
    const system = read('src/editor/media/media-system.ts');
    expect(system).toContain("return { view: 'create', kind: 'image', provider: 'gallery' }");
    expect(system).toContain("action === 'gallery' ? 'gallery'");
  });

  it('routes typed launcher actions through the canonical Media browser before secondary sources', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(controller).toContain('data-media-type-browser={session.route.kind}');
    expect(controller).toContain('initialTab={browserTab}');
    expect(controller).toContain('onPick={pickFromProjectMedia}');
    expect(controller).toContain("{ value: 'media', label: 'Media', glyph: 'media' }");
    expect(controller).toContain("{ value: 'sources', label: 'Find & create', glyph: 'search' }");
    expect(controller).toContain("{ value: 'url', label: 'URL', glyph: 'behavior' }");
    expect(controller).toContain("typeSource !== 'media' ? () => setTypeSource('media') : goHome");
  });

  it('keeps existing polished search/create pickers subordinate to the same toolbar shell', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(controller).toContain("typeSource === 'sources'");
    expect(controller).toContain("typeSource === 'url'");
    expect(controller).toContain("onClose={() => setTypeSource('media')}");
    expect(controller).not.toContain("content = imagePicker;");
    expect(controller).not.toContain("content = videoPicker;");
  });

});
