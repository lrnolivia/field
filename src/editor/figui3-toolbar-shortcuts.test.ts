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
    expect(menu).toContain("label: 'Line', shortcut: 'L'");
    expect(menu).toContain("label: 'Pen', shortcut: 'P'");
    expect(menu).toContain("label: 'Pencil', shortcut: 'Shift+P'");
  });

  it('keeps Space pan highlighting contextual while creator tools own the parenting override', () => {
    expect(shortcuts).toContain("Pan / parenting override (hold)");
    expect(shortcuts).toContain("!isCreatorToolMode(toolModeRef.current)");
    expect(store).toContain("export function isCreatorToolMode");
  });


  it('keeps Figma Frame Selection as the visible shortcut and the legacy chord as a compatibility alias', () => {
    expect(shortcuts).toContain("key: 'g', ctrl: true, alt: true");
    expect(shortcuts).toContain("label: 'Frame Selection'");
    expect(shortcuts).toContain("key: 'a', shift: true, alt: true");
    expect(shortcuts).toContain("hideFromHelp: true");
  });
});
