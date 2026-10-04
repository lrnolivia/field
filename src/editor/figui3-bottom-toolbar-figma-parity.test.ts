// FIGUI3_BOTTOM_TOOLBAR_FIGMA_PARITY_TEST_20260927
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 bottom toolbar Figma parity', () => {
  it('uses one floating island with grouped authoring + flat utilities', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('FIGUI3_TOOLBAR_FIGMA_PASS_20260927');
    const authoring = toolbar.indexOf('data-toolbar-cluster="authoring"');
    const utility = toolbar.indexOf('data-toolbar-cluster="utility"');
    expect(authoring).toBeGreaterThan(-1);
    expect(utility).toBeGreaterThan(authoring);
    expect(toolbar).toContain('rounded-[inherit]');
    expect(toolbar).toContain('var(--field-selection-shell-radius, 11px)');
    expect(toolbar).toContain('className="flex items-center gap-0.5"');
    expect(toolbar).not.toContain('data-toolbar-cluster="utility"\n          className="flex items-center gap-0.5 p-0.5');
  });

  it('groups Move/Hand/Scale, Frame, and Shapes with Figma-like split buttons', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('function CursorDropdown');
    expect(toolbar).toContain('function FrameDropdown');
    expect(toolbar).toContain('function ShapeDropdown');
    expect(toolbar).toContain('label="Move" shortcut="V"');
    expect(toolbar).toContain('label="Hand tool" shortcut="H"');
    expect(toolbar).toContain('label="Scale" shortcut="K"');
    expect(toolbar).toContain('label="Frame" shortcut="F"');
    expect(toolbar).toContain('label="Section library…"');
  });

  it('uses field-native shape semantics with Image/video as the default family face', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain("useState<ShapeToolChoice>('media')");
    expect(toolbar).toContain('label="Image/video…"');
    expect(toolbar).toContain('label="Rectangle" shortcut="R"');
    expect(toolbar).toContain('label="Line" shortcut="L"');
    expect(toolbar).toContain('label="Ellipse" shortcut="O"');
    expect(toolbar).toContain('label="Triangle" shortcut="Shift+T"');
    expect(toolbar).toContain('<ResourcesButton />');
    expect(toolbar).not.toContain('<LayoutDropdown');
  });

  it('groups Pen/Pencil while keeping Text direct and Resources canonical', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(toolbar).toContain('function PenDropdown');
    expect(toolbar).toContain('label="Pen" shortcut="P"');
    expect(toolbar).toContain('label="Pencil" shortcut="Shift+P"');
    expect(toolbar).toContain('dataTool="text"');
    expect(toolbar).toContain('<ResourcesButton />');
    expect(toolbar).not.toContain('function ResourcesMenu');
  });

  it('keeps only compact routine utilities after the authoring cluster', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    const start = toolbar.indexOf('data-toolbar-cluster="utility"');
    const utility = toolbar.slice(start);
    expect(utility).toContain('<SmartZoomButton');
    expect(utility).toContain('title="Search (⌘K)"');
    expect(utility).toContain('dataTool="comment"');
    expect(utility).toContain('Upgrade');
  });
});
