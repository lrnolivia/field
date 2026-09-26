// FIGUI3_BOTTOM_TOOLBAR_FIGMA_PARITY_TEST_20260926
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 bottom toolbar Figma parity', () => {
  it('uses a Figma-like authoring cluster followed by a compact utility cluster', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('FIGUI3_BOTTOM_TOOLBAR_FIGMA_PARITY_20260926');
    expect(toolbar).toContain('FIGUI3_TOOLBAR_RESOURCE_VIEW_CONTROLS_20260926');
    const authoring = toolbar.indexOf('data-toolbar-cluster="authoring"');
    const utility = toolbar.indexOf('data-toolbar-cluster="utility"');
    expect(authoring).toBeGreaterThan(-1);
    expect(utility).toBeGreaterThan(authoring);
    expect(toolbar).toContain('p-0.5 rounded-[8px] bg-[var(--control-bg)]');
  });

  it('keeps the primary tool order Figma-like while adding Resources', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    const start = toolbar.indexOf('data-toolbar-cluster="authoring"');
    const end = toolbar.indexOf('data-toolbar-cluster="utility"');
    const authoring = toolbar.slice(start, end);

    const select = authoring.indexOf('<CursorDropdown');
    const frame = authoring.indexOf('dataTool="frame"');
    const shape = authoring.indexOf('<ShapeDropdown');
    const sketch = authoring.indexOf('dataTool="sketch"');
    const text = authoring.indexOf('dataTool="text"');
    const resources = authoring.indexOf('<ResourcesMenu');
    const layout = authoring.indexOf('<LayoutDropdown');

    for (const index of [select, frame, shape, sketch, text, resources, layout]) {
      expect(index).toBeGreaterThan(-1);
    }
    expect(select).toBeLessThan(frame);
    expect(frame).toBeLessThan(shape);
    expect(shape).toBeLessThan(sketch);
    expect(sketch).toBeLessThan(text);
    expect(text).toBeLessThan(resources);
    expect(resources).toBeLessThan(layout);
  });

  it('keeps Sketch independent from Shapes', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('title="Sketch (Shift+P)"');
    expect(toolbar).toContain('dataTool="sketch"');
    expect(toolbar).not.toContain('MenuItem label="Sketch"');
  });

  it('keeps only compact routine utilities on the toolbar', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    const start = toolbar.indexOf('data-toolbar-cluster="utility"');
    const utility = toolbar.slice(start);

    expect(utility).toContain('<SmartZoomButton');
    expect(utility).toContain('title="Search (⌘K)"');
    expect(utility).toContain('dataTool="comment"');
    expect(utility).toContain('Upgrade');
    expect(utility).not.toContain('<LocaleDropdown');
    expect(utility).not.toContain('<ThemeSwitcher');
    expect(utility).not.toContain('<ZoomDropdown');
  });

  it('uses 36px authoring slots and 32px compact utility actions', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain("'w-[32px] h-[32px]' : 'w-[36px] h-[36px]'");
    expect(toolbar).toContain('w-[32px] h-[32px]');
    expect(toolbar).toContain('data-toolbar-tool={dataTool}');
    expect(toolbar).toContain('aria-label="Search (⌘K)"');
  });
});
