import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('field.MOTION control integration contract', () => {
  it('keeps motion local to affordances and removes legacy one-off timing', () => {
    const add = source('src/design-system/AddButton.tsx');
    const sidebar = source('src/design-system/SidebarRow.tsx');
    const spacing = source('src/editor/controls/SpacingControl.tsx');
    const color = source('src/editor/controls/ColorInput.tsx');
    const remove = source('src/editor/controls/RemoveButton.tsx');
    const stepper = source('src/editor/controls/ToolPlusMinus.tsx');

    expect(add).toContain('data-field-motion="add"');
    expect(add).toContain('data-field-motion-part="glyph"');
    expect(sidebar).toContain('data-field-motion="sidebar-disclosure"');
    expect(sidebar).not.toContain('transition: "transform 120ms"');
    expect(spacing).toContain('AxisMotionGlyph');
    expect(spacing).not.toContain('>↔</span>');
    expect(spacing).not.toContain('>↕</span>');
    expect(color).toContain('<ColorSwatch interactive');
    expect(remove).toContain('data-field-motion="remove"');
    expect(stepper).toContain('data-field-motion="stepper-minus"');
    expect(stepper).toContain('data-field-motion="stepper-plus"');
  });

  it('preserves state semantics and reduced-motion hooks', () => {
    const section = source('src/editor/controls/ToolSection.tsx');
    const toggle = source('src/editor/controls/ToolSwitch.tsx');

    expect(section).toContain('<AnimatePresence initial={false}>');
    expect(section).toContain('useFieldReducedMotion()');
    expect(toggle).toContain('role="switch"');
    expect(toggle).toContain('aria-checked={value}');
    expect(toggle).toContain('fieldMotion.toggle');
    expect(toggle).not.toContain('duration-200 ease-in-out');

    const remove = source('src/editor/controls/RemoveButton.tsx');
    const stepper = source('src/editor/controls/ToolPlusMinus.tsx');
    const spacing = source('src/editor/controls/SpacingControl.tsx');
    const color = source('src/editor/controls/ColorInput.tsx');
    expect(remove).toContain('<motion.button');
    expect(remove).toContain('type="button"');
    expect(stepper).toContain('aria-label="Decrease value"');
    expect(stepper).toContain('aria-label="Increase value"');
    expect(spacing).not.toContain('tabIndex={-1}');
    expect(spacing).toContain('skipBlurCommitRef');
    expect(color).toContain('aria-label={swatchOnly ? `Choose color ${displayText}` : undefined}');
    expect(color).toContain('<RemoveButton label="Clear color preset"');
  });
});
