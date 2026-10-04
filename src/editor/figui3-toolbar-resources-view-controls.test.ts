// FIGUI3_TOOLBAR_RESOURCES_VIEW_CONTROLS_TEST_20260929
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 Library, Media, and view controls', () => {
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
  });

  it('keeps editor appearance separate from website Canvas/Preview appearance', () => {
    const appearance = read('src/editor/EditorAppearanceControl.tsx');
    const appearancePanel = read('src/editor/AppearancePopover.tsx');
    const canvasTheme = read('src/canvas/canvas-theme.ts');
    const preferences = read('src/code/stores/user-preferences-store.ts');
    expect(appearance).toContain('<AppearancePopover');
    expect(appearancePanel).toContain('applyEditorChromePreferences');
    expect(appearancePanel).not.toContain('websitePreviewThemeAtom');
    expect(appearance).not.toContain('refreshCanvasTokens');
    expect(preferences).toContain('websitePreviewThemeAtom');
    expect(canvasTheme).toContain('websitePreviewThemeAtom');
  });

  it('keeps Zoom and website appearance beside Preview while pane controls live with Design/Prototype', () => {
    const header = read('src/editor/header/RightHeader.tsx');
    const tabs = read('src/editor/controls/InspectorModeTabs.tsx');
    expect(header).toContain('<InspectorZoomControl />');
    expect(header).toContain('<WebsitePreviewAppearanceControl />');
    expect(header).not.toContain('data-inspector-header-pane-actions');
    expect(tabs).toContain('data-inspector-pane-actions');
    expect(tabs).toContain('right-inspector-autohide');
    expect(tabs).toContain('right-inspector-collapse');
  });
});
