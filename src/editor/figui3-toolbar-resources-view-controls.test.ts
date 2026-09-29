// FIGUI3_TOOLBAR_RESOURCES_VIEW_CONTROLS_TEST_20260927
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 Library and Media placement', () => {
  it('keeps Media independent of Shape and opens its anchored launcher without using the left sidebar', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    const shape = toolbar.indexOf('<ShapeDropdown');
    const media = toolbar.indexOf('<MediaButton');
    const library = toolbar.indexOf('<LibraryDropdown');
    const pen = toolbar.indexOf('<PenDropdown');
    expect(toolbar).toContain("useState<ShapeToolChoice>('rectangle')");
    expect(toolbar).not.toContain('label="Image/video…"');
    expect(toolbar).toContain('title="Library"');
    expect(toolbar).toContain("setToolbarPanel({ kind: 'library', section })");
    expect(toolbar).toContain("setPanel({ kind: 'media' })");
    expect(toolbar).toContain("createMediaSession({ surface: 'toolbar' })");
    expect(media).toBeGreaterThan(shape);
    expect(library).toBeGreaterThan(media);
    expect(library).toBeLessThan(pen);
  });

  it('uses deterministic smart zoom: selection when selected, canvas otherwise', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain("zoomToFitSelection(root, [selectedId])");
    expect(toolbar).toContain("zoomToFit(root)");
    expect(toolbar).toContain("target: 'selection'");
    expect(toolbar).toContain("target: 'canvas'");
  });

  it('moves full zoom and appearance controls into the Inspector', () => {
    const inspector = read('src/editor/controls/InspectorZoomControl.tsx');
    expect(inspector).toContain('FIGUI3_INSPECTOR_VIEW_CONTROLS_20260926');
    expect(inspector).toContain('data-inspector-view-controls');
    expect(inspector).toContain('data-inspector-theme');
    expect(inspector).toContain('data-inspector-zoom');
    expect(inspector).toContain('placement="below"');
    expect(inspector).toContain("fieldSurfaceZ('menu', ref.current)");
  });

  it('positions appearance popup below Inspector chrome and on semantic elevation', () => {
    const appearance = read('src/editor/ui/ThemeNeutralPopover.tsx');
    expect(appearance).toContain("placement?: 'above' | 'below'");
    expect(appearance).toContain("'absolute right-0 top-full mt-1'");
    expect(appearance).toContain("fieldSurfaceZ('menu', anchorRef.current)");
    expect(appearance).toContain('data-field-floating-surface');
  });
});
