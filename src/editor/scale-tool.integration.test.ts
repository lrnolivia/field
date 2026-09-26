import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('dedicated Scale product integration', () => {
  it('owns K and migrates Sketch to Shift+P', () => {
    const shortcuts = read('src/canvas/shortcuts.ts');
    expect(shortcuts).toContain("key: 'k', label: 'Scale tool'");
    expect(shortcuts).toContain("key: 'p', shift: true, label: 'Sketch tool'");
    expect(shortcuts).not.toContain("key: 'k', label: 'Sketch tool'");
  });

  it('puts Scale in the cursor family and advertises the migrated Sketch key', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('label="Scale" shortcut="K"');
    expect(toolbar).toContain('title="Sketch (Shift+P)"');
    expect(toolbar).not.toContain('MenuItem label="Sketch"');
  });

  it('uses dedicated corner-only Scale handles instead of renaming Resize', () => {
    const handles = read('src/canvas/selection/ScaleHandles.tsx');
    expect(handles).toContain('data-scale-dir');
    expect(handles).not.toContain('data-resize-edge');
    const overlay = read('src/canvas/selection/SelectionOverlay.tsx');
    expect(overlay).toContain("toolMode === 'scale'");
    expect(overlay).toContain('<ScaleHandles');
  });

  it('exposes W/H/multiplier/3x3 anchor in the inspector', () => {
    const panel = read('src/editor/tools/ScaleTool.tsx');
    expect(panel).toContain('data-scale-width');
    expect(panel).toContain('data-scale-height');
    expect(panel).toContain('data-scale-multiplier');
    expect(panel).toContain('data-scale-anchor-grid');
    expect(panel.match(/role="radio"/g)?.length).toBe(1); // mapped button source, 9 at runtime
    const properties = read('src/editor/PropertiesPanel.tsx');
    expect(properties).toContain("toolMode === 'scale'");
    expect(properties).toContain('<ScaleTool');
  });

  it('keeps Scale source-authored rather than permanent transform-scale model', () => {
    const op = read('src/canvas/scale/scale-operation.ts');
    expect(op).toContain('domOnly: !commit');
    expect(op).toContain('flushNow()');
    expect(op).toContain('planNativeGroupRefitChain');
    expect(op).toContain('includeUnchanged: true');
    expect(op).toContain('root-left-not-safely-scalable');
    expect(op).toContain('isUniformSvgViewportLeaf');
    expect(op).toContain('svg-group-scale-needs-geometry-bake');
    expect(op).toContain('svg-scale-requires-viewbox');
    expect(op).toContain('planScaledSvgShapeAttrs');
    expect(op).toContain('scaleSvgViewBox');
    expect(op).toContain("type: 'updateHtmlAttrs'");
    expect(op).toContain("type: 'updateSvgAttrs'");
    expect(op).not.toContain('ResizeManager');
    expect(op).toContain("trace.action('scale:no-op'");
    expect(op).toContain("trace.action('scale:cancel'");
    expect(op).not.toContain('transform: `scale(');
    expect(op).not.toContain("transform: 'scale(");
  });
});
