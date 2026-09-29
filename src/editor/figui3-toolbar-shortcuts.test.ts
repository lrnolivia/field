import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('FigUI3 grouped toolbar shortcuts', () => {
  const shortcuts = readFileSync('src/canvas/shortcuts.ts', 'utf8');
  const store = readFileSync('src/code/stores/tool-store.ts', 'utf8');
  const menu = readFileSync('src/editor/header/menu-builders.tsx', 'utf8');

  it('uses a real Line tool on L while Pen remains P and Pencil remains Shift+P', () => {
    expect(store).toContain("'shape-line'");
    expect(shortcuts).toContain("key: 'l', label: 'Line tool'");
    expect(shortcuts).toContain("key: 'p', label: 'Pen tool'");
    expect(shortcuts).toContain("key: 'p', shift: true, label: 'Sketch tool'");
    expect(menu).toContain("label: 'line', shortcut: 'L'");
    expect(menu).toContain("label: 'pen', shortcut: 'P'");
    expect(menu).toContain("label: 'pencil', shortcut: 'Shift+P'");
  });
});
