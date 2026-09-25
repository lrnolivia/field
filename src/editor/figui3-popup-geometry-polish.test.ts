// FIGUI3_POPUP_GEOMETRY_POLISH_TEST_20260925
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 popup geometry + de-stroke polish', () => {
  it('removes inherited cut-corner grammar from ToolPopup', () => {
    const file = read('src/editor/ui/ToolPopup.tsx');
    expect(file).toContain('FIGUI3_POPUP_TOOL_SHELL_20260925');
    expect(file).toContain('rounded-[8px]');
    expect(file).toContain('shadow-[var(--shadow-lg)]');
    expect(file).not.toContain('cut-corners');
    expect(file).not.toContain('cut-border');
    expect(file).not.toContain('--cut-border-color');
  });

  it('uses rounded token-driven SearchableDropdown surfaces', () => {
    const file = read('src/editor/ui/SearchableDropdown.tsx');
    expect(file).toContain('FIGUI3_POPUP_SEARCHABLE_20260925');
    expect(file).toContain('rounded-[8px]');
    expect(file).toContain('hover:bg-[var(--bg-hover)]');
    expect(file).toContain('data-[submenu-open]:bg-[var(--bg-hover)]');
    expect(file).not.toContain('cut-corners');
    expect(file).not.toContain('cut-border');
    expect(file).not.toContain('bg-white/[0.06]');
  });

  it('quietens the neutral appearance swatches without losing selection', () => {
    const file = read('src/editor/ui/ThemeNeutralPopover.tsx');
    expect(file).toContain('FIGUI3_POPUP_NEUTRAL_APPEARANCE_20260925');
    expect(file).toContain('w-[168px]');
    expect(file).toContain('border border-transparent');
    expect(file).toContain('shadow-[inset_0_0_0_1px_var(--selection)]');
    expect(file).toContain('hover:shadow-[inset_0_0_0_1px_var(--text-tertiary)]');
    expect(file).not.toContain("border-[var(--border-default)] hover:border");
  });

  it('preserves popup wheel containment and nested navigation contracts', () => {
    const tool = read('src/editor/ui/ToolPopup.tsx');
    const searchable = read('src/editor/ui/SearchableDropdown.tsx');
    expect(tool).toContain('onWheelCapture={(e) => e.stopPropagation()}');
    expect(tool).toContain('pushPanel');
    expect(tool).toContain('popPanel');
    expect(searchable).toContain('onWheelCapture={(event) => event.stopPropagation()}');
    expect(searchable).toContain('getSubmenu');
  });
});
