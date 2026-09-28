// FIGUI3_STRUCTURAL_PARITY_20260927
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 structural parity with explicit workspace modes', () => {
  it('keeps floating, docked, and collapsed as distinct user actions', () => {
    const layout = read('src/editor/workspace-layout.ts');
    const restore = read('src/editor/WorkspaceRestoreBar.tsx');
    const floating = read('src/editor/FloatingLeftPanelHost.tsx');
    expect(layout).toContain('Pane presentation is explicit');
    expect(layout).toContain("presentation: 'floating'");
    expect(restore).toContain('data-workspace-left-restore');
    expect(floating).toContain('Resize floating left panel');
  });

  it('persists independently resizable left and right pane widths', () => {
    const store = read('src/code/stores/workspace-panels-store.ts');
    const handles = read('src/editor/WorkspacePaneResizeHandles.tsx');
    expect(store).toContain('leftContentWidthAtom');
    expect(store).toContain('rightPaneWidthAtom');
    expect(handles).toContain('data-workspace-resize="left"');
    expect(handles).toContain('data-workspace-resize="right"');
    expect(handles).toContain('cursor-col-resize');
  });

  it('prioritizes component instance properties above generic geometry', () => {
    const inspector = read('src/editor/PropertiesPanel.tsx');
    const priority = inspector.indexOf('data-inspector-instance-priority');
    const geometry = inspector.indexOf('data-inspector-group="geometry"');
    expect(priority).toBeGreaterThan(-1);
    expect(priority).toBeLessThan(geometry);
    expect(inspector).toContain('!isComponentInstance && <ComponentPropsTool />');
  });

  it('composes frame Position and Size into the canonical Layout section', () => {
    const inspector = read('src/editor/PropertiesPanel.tsx');
    const layout = read('src/editor/tools/LayoutTool.tsx');
    const position = read('src/editor/tools/PositionTool/index.tsx');
    expect(inspector).toContain('composePositionIntoLayout');
    expect(inspector).toContain('positionContent={composePositionIntoLayout');
    expect(layout).toContain('positionContent?: ReactNode');
    expect(layout).toContain('{positionContent}');
    expect(position).toContain('bare?: boolean');
    expect(position).toContain('data-layout-position-inline-header');
  });

  it('uses rounded FigUI3 chrome for mode tabs and the Actions palette', () => {
    const tabs = read('src/editor/controls/InspectorModeTabs.tsx');
    const palette = read('src/editor/command-palette/CommandPalette.tsx');
    expect(tabs).toContain('rounded-[5px]');
    expect(tabs).not.toContain('cut-corners');
    expect(palette).toContain('rounded-[12px]');
    expect(palette).toContain('rounded-[6px]');
    expect(palette).not.toContain('cut-corners');
    expect(palette).not.toContain('cut-border');
  });
});
