// FIGUI3_BOTTOM_TOOLBAR_FIGMA_PARITY_TEST_20260926
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 bottom toolbar Figma parity', () => {
  it('uses a Figma-like authoring cluster followed by a distinct utility cluster', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('FIGUI3_BOTTOM_TOOLBAR_FIGMA_PARITY_20260926');
    const authoring = toolbar.indexOf('data-toolbar-cluster="authoring"');
    const utility = toolbar.indexOf('data-toolbar-cluster="utility"');
    expect(authoring).toBeGreaterThan(-1);
    expect(utility).toBeGreaterThan(authoring);
    expect(toolbar).toContain('p-0.5 rounded-[8px] bg-[var(--control-bg)]');
  });

  it('keeps the primary tool order Figma-like without deleting field-only creation tools', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    const start = toolbar.indexOf('data-toolbar-cluster="authoring"');
    const end = toolbar.indexOf('data-toolbar-cluster="utility"');
    const authoring = toolbar.slice(start, end);

    const select = authoring.indexOf('<CursorDropdown');
    const frame = authoring.indexOf('dataTool="frame"');
    const shape = authoring.indexOf('<ShapeDropdown');
    const sketch = authoring.indexOf('dataTool="sketch"');
    const text = authoring.indexOf('dataTool="text"');
    const layout = authoring.indexOf('<LayoutDropdown');

    for (const index of [select, frame, shape, sketch, text, layout]) {
      expect(index).toBeGreaterThan(-1);
    }
    expect(select).toBeLessThan(frame);
    expect(frame).toBeLessThan(shape);
    expect(shape).toBeLessThan(sketch);
    expect(sketch).toBeLessThan(text);
    expect(text).toBeLessThan(layout);
  });

  it('gives Sketch its own pen-like toolbar slot instead of hiding it in Shapes', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('title="Sketch (K)"');
    expect(toolbar).toContain('dataTool="sketch"');
    expect(toolbar).not.toContain('MenuItem label="Sketch"');
  });

  it('preserves field utilities in the secondary cluster', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    const start = toolbar.indexOf('data-toolbar-cluster="utility"');
    const utility = toolbar.slice(start);

    expect(utility).toContain('<ZoomDropdown');
    expect(utility).toContain('title="Search (⌘K)"');
    expect(utility).toContain('<LocaleDropdown');
    expect(utility).toContain('<ThemeSwitcher');
    expect(utility).toContain('dataTool="comment"');
    expect(utility).toContain('Upgrade');
  });

  it('uses square 36px primary tool buttons and an icon-only search utility', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('w-[36px] h-[36px] rounded-[6px]');
    expect(toolbar).toContain('data-toolbar-tool={dataTool}');
    expect(toolbar).toContain('aria-label="Search (⌘K)"');
    expect(toolbar).not.toContain('<span className="text-[11px] text-[var(--text-tertiary)]">⌘K</span>');
  });
});
