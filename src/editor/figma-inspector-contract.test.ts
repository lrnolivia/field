import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8');

describe('Figma inspector contract', () => {
  it('exposes one canonical section grammar', () => {
    const section = read('src/editor/controls/ToolSection.tsx');
    expect(section).toContain('data-inspector-section={sectionId}');
    expect(section).toContain('data-inspector-section-card');
    expect(section).toContain('data-inspector-section-kind={sectionVisualKind(title)}');
    expect(section).toContain('data-inspector-section-glyph');
    expect(section).toContain('rounded-[10px]');
    expect(section).toContain('data-inspector-section-header');
    expect(section).toContain('data-inspector-section-content');
  });

  it('uses the dedicated FigUI3 object header', () => {
    const panel = read('src/editor/PropertiesPanel.tsx');
    const header = read('src/editor/controls/InspectorObjectHeader.tsx');
    expect(panel).toContain('<InspectorObjectHeader');
    expect(header).toContain('data-inspector-object-header');
    expect(panel).not.toContain('inspectorContextDetail');
    expect(panel).toContain("? 'Text'");
    expect(panel).toContain("? 'Frame'");
  });

  it('keeps Layout permanent while Auto layout owns child arrangement only', () => {
    const size = read('src/editor/tools/SizeTool.tsx');
    const layout = read('src/editor/tools/LayoutTool.tsx');
    const panel = read('src/editor/PropertiesPanel.tsx');
    const padding = read('src/editor/tools/LayoutPaddingControl.tsx');

    expect(size).toContain('<ToolSection title="Layout"');
    expect(size).toContain('{paddingContent}');
    expect(size).toContain('data-layout-clip-content');
    expect(size).not.toContain('<ToolSection title="Dimensions"');

    expect(panel).toContain('<LayoutPaddingControl');
    expect(panel).toContain('paddingContent={(isFrame || isViewportFrame)');
    expect(panel).not.toContain('composeSizeIntoAutoLayout');
    expect(panel).not.toContain('sizeContent={composeSizeIntoAutoLayout');

    expect(layout).toContain('title="Auto layout"');
    expect(layout).toContain('renderWhenEmpty');
    expect(layout).not.toContain('sizeContent');
    expect(layout).not.toContain('AutoLayoutPaddingControl');
    expect(layout).not.toContain('data-auto-layout-clip-content');

    expect(padding).toContain('data-layout-padding-view');
    expect(padding).toContain("placeholder={allEqual ? undefined : 'Mixed'}");
    expect(padding).toContain('data-layout-padding-equal');
    expect(padding).toContain('data-layout-padding-axes');
    expect(padding).toContain('data-layout-padding-axis-mode');
    expect(padding).toContain("setView('axes')");
    expect(padding).toContain('data-layout-padding-sides');
  });

  it('keeps the text core stack in Figma order and tucks typography details away', () => {
    const text = read('src/editor/tools/TextStyleTool/index.tsx');
    const advanced = read('src/editor/tools/TextStyleTool/TypographyAdvancedPopover.tsx');
    const titles = ['Typography', 'Fill', 'Stroke', 'Effects'];
    let prev = -1;
    for (const title of titles) {
      const i = text.indexOf(`title="${title}"`);
      expect(i, title).toBeGreaterThan(prev);
      prev = i;
    }
    expect(text).toContain('<TypographyPresetControl compact />');
    expect(text).toContain('<FontFamilyControl compact />');
    expect(text).toContain('data-typography-weight-size');
    expect(text).toContain('data-typography-leading-spacing');
    expect(text).toContain('<TypographyAdvancedPopover />');
    expect(advanced).toContain('Basics');
    expect(advanced).toContain('Details');
    expect(advanced).toContain('Vertical trim');
    expect(advanced).toContain('Truncate text');
  });

  it('splits the inherited Styles mega-panel into Figma property sections', () => {
    const styles = read('src/editor/tools/StylesTool/index.tsx');
    for (const title of ['Appearance', 'Fill', 'Stroke', 'Effects', 'Advanced']) {
      expect(styles).toContain(`title="${title}"`);
    }
    expect(styles).toContain('<AppearanceHeaderActions');
    expect(styles).toContain('<StyleSectionActions property="backgroundColor"');
    expect(styles).toContain('<StyleSectionActions property="border"');
    expect(styles).toContain('<StyleSectionActions property="boxShadow"');
    expect(styles).not.toContain('<ToolSection title="Styles"');
  });

  it('keeps Design and Prototype as distinct inspector modes with inspector zoom', () => {
    const panel = read('src/editor/PropertiesPanel.tsx');
    const tabs = read('src/editor/controls/InspectorModeTabs.tsx');
    const zoom = read('src/editor/controls/InspectorZoomControl.tsx');
    expect(panel).toContain('<InspectorModeTabs />');
    expect(panel).toContain("inspectorMode === 'design'");
    expect(panel).toContain('data-inspector-group="prototype"');
    const header = read('src/editor/controls/InspectorObjectHeader.tsx');
    expect(header).toContain('Variables');
    expect(tabs).toContain('Design');
    expect(tabs).toContain('Prototype');
    expect(tabs).toContain('<InspectorZoomControl />');
    expect(zoom).toContain('data-inspector-zoom');
  });

  it('keeps Position compact and uses Figma transform/constraint motifs', () => {
    const size = read('src/editor/tools/SizeTool.tsx');
    const position = read('src/editor/tools/PositionTool/index.tsx');
    const alignment = read('src/editor/tools/PositionTool/AlignmentControl.tsx');
    const pins = read('src/editor/tools/PositionTool/PinControl.tsx');
    const rotate = read('src/editor/tools/StylesTool/atoms/RotateControl.tsx');
    expect(size).toContain('data-layout-size-pair');
    expect(size).toContain('data-dimension-sizing-menu');
    expect(size).toContain('data-layout-clip-content');
    expect(size).toContain('Clip content');
    expect(position).toContain('<ToolPopup');
    expect(position).toContain('<PinControl');
    expect(position).toContain('compact');
    expect(position).toContain('<RotateControl compact />');
    expect(position).toContain('updatePositionCoord');
    expect(alignment).toContain('data-position-alignment-groups');
    expect(pins).toContain('data-figma-constraints');
    expect(rotate).toContain('data-position-transform-row');
    expect(rotate).toContain('data-position-rotation-field');
    expect(rotate).toContain('chevronLabel="°"');
    expect(rotate).toContain('Flip horizontal');
    expect(rotate).toContain('Flip vertical');
    expect(rotate).toContain('Rotate 90°');
  });

  it('uses the shared compact control motif in Auto layout', () => {
    const layout = read('src/editor/tools/LayoutTool.tsx');
    const motif = read('src/editor/controls/InspectorIconButtonGroup.tsx');
    expect(motif).toContain('data-inspector-icon-group');
    expect(layout).toContain('ariaLabel="Auto layout mode"');
    expect(layout).toContain('data-auto-layout-alignment');
    expect(layout).toContain('Distribution');
    expect(layout).not.toContain('ControlLabel label="Direction"');
    expect(layout).not.toContain('ControlLabel label="Wrap"');
    expect(layout).toContain('{alignmentMatrix}');
    // Box geometry belongs to permanent Layout, never to Auto layout.
    expect(layout).not.toContain('AutoLayoutPaddingControl');
    expect(layout).not.toContain('data-auto-layout-clip-content');
    expect(layout).not.toContain('sizeContent');
  });

  it('mounts core appearance separately from advanced web controls', () => {
    const panel = read('src/editor/PropertiesPanel.tsx');
    expect(panel).toContain('<StylesTool scope="appearance" />');
    expect(panel).toContain('<StylesTool scope="advanced" />');
    const appearance = panel.indexOf('<StylesTool scope="appearance" />');
    const typography = panel.indexOf('{isText && <TextStyleTool />}');
    expect(typography).toBeGreaterThan(appearance);
  });
});
