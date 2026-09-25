import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FIELD-INSPECTOR-FIGUI3-005 core select contract', () => {
  it('implements FieldSelect as a field-owned portalled listbox, never a native select', () => {
    const source = read('src/editor/controls/FieldSelect.tsx');
    expect(source).toContain("createPortal(");
    expect(source).toContain('role="listbox"');
    expect(source).toContain('role="option"');
    expect(source).toContain('data-field-menu-surface');
    expect(source).toContain('data-field-no-canvas-input');
    expect(source).toContain('onWheelCapture');
    expect(source).toContain("event.key === 'ArrowDown'");
    expect(source).toContain("event.key === 'ArrowUp'");
    expect(source).toContain("event.key === 'Home'");
    expect(source).toContain("event.key === 'End'");
    expect(source).toContain("event.key === 'Escape'");
    expect(source).not.toMatch(/<select\b/i);
    expect(source).not.toMatch(/<option\b/i);
  });

  it('removes native Ease / Repeat / Fill selects from the Animation keyframe sheet', () => {
    const source = read('src/editor/tools/AnimationTool/css/KeyframeSheet.tsx');
    expect(source).toContain("import FieldSelect from '@/editor/controls/FieldSelect';");
    expect(source).toContain('ariaLabel="Ease"');
    expect(source).toContain('ariaLabel="Repeat"');
    expect(source).toContain('ariaLabel="Fill"');
    expect(source).not.toMatch(/<select\b/i);
    expect(source).not.toMatch(/<option\b/i);
  });

});
