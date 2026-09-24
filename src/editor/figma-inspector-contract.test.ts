import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8');

describe('Figma inspector contract', () => {
  it('exposes one canonical section grammar', () => {
    const section = read('src/editor/controls/ToolSection.tsx');
    expect(section).toContain('data-inspector-section={sectionId}');
    expect(section).toContain('data-inspector-section-header');
    expect(section).toContain('data-inspector-section-content');
  });

  it('uses a one-line object-kind header', () => {
    const panel = read('src/editor/PropertiesPanel.tsx');
    expect(panel).toContain('data-inspector-object-header');
    expect(panel).not.toContain('inspectorContextDetail');
    expect(panel).toContain("? 'Text'");
    expect(panel).toContain("? 'Frame'");
  });

  it('uses Figma layout naming instead of Dimensions + duplicate Layout', () => {
    const size = read('src/editor/tools/SizeTool.tsx');
    const layout = read('src/editor/tools/LayoutTool.tsx');
    expect(size).toContain('<ToolSection title="Layout"');
    expect(size).not.toContain('<ToolSection title="Dimensions"');
    expect(layout).toContain('<ToolSection title="Auto layout"');
  });

  it('keeps the text core stack in Figma order', () => {
    const text = read('src/editor/tools/TextStyleTool/index.tsx');
    const titles = ['Typography', 'Fill', 'Stroke', 'Effects'];
    let prev = -1;
    for (const title of titles) {
      const i = text.indexOf(`<ToolSection title="${title}"`);
      expect(i, title).toBeGreaterThan(prev);
      prev = i;
    }
    expect(text).not.toContain('<ToolSection title="Text"');
  });

  it('splits the inherited Styles mega-panel into Figma property sections', () => {
    const styles = read('src/editor/tools/StylesTool/index.tsx');
    for (const title of ['Appearance', 'Fill', 'Stroke', 'Effects', 'Advanced']) {
      expect(styles).toContain(`<ToolSection title="${title}"`);
    }
    expect(styles).not.toContain('<ToolSection title="Styles"');
  });

  it('keeps Design and Prototype as distinct inspector modes', () => {
    const panel = read('src/editor/PropertiesPanel.tsx');
    const tabs = read('src/editor/controls/InspectorModeTabs.tsx');
    expect(panel).toContain('<InspectorModeTabs />');
    expect(panel).toContain("inspectorMode === 'design'");
    expect(panel).toContain('data-inspector-group="prototype"');
    expect(tabs).toContain('Design');
    expect(tabs).toContain('Prototype');
  });

  it('surfaces frame clipping in Layout and rotation in Position', () => {
    const size = read('src/editor/tools/SizeTool.tsx');
    const position = read('src/editor/tools/PositionTool/index.tsx');
    expect(size).toContain('data-layout-clip-content');
    expect(size).toContain('Clip content');
    expect(position).toContain('<RotateControl />');
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
