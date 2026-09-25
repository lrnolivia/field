// FIGUI3_CORRECTIVE_TYPOGRAPHY_TEST_20260925
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 typography controls', () => {
  it('uses one field-native family trigger plus the rich browser button', () => {
    const family = read('src/editor/tools/TextStyleTool/atoms/FontFamilyControl.tsx');
    expect(family).toContain('data-typography-font-family-trigger');
    expect(family).toContain('data-typography-font-browser-button');
    expect(family).toContain('title="Browse fonts"');
    expect(family).toContain('text-left');
    expect(family).toContain('<FontFamilyPopup');
    expect(family).not.toContain('data-typography-font-family-select');
    expect(family).not.toContain('<select');
  });

  it('adds the supplied Figma font-size preset ladder', () => {
    const property = read('src/editor/tools/TextStyleTool/atoms/TextPropertyControl.tsx');
    expect(property).toContain('FONT_SIZE_PRESETS = [10, 11, 12, 13, 14, 15, 16, 20, 24, 32, 36, 40, 48, 64, 96, 128]');
    expect(property).toContain('data-typography-font-size-presets');
    expect(property).toContain('aria-label="Font size presets"');
  });

  it('keeps compact numeric typography fields editable with visible steppers', () => {
    const property = read('src/editor/tools/TextStyleTool/atoms/TextPropertyControl.tsx');
    const input = read('src/editor/controls/ToolInput.tsx');
    expect(property).toContain('alwaysShowStepper');
    expect(property).toContain('text={isClamp}');
    expect(input).toContain('alwaysShowStepper?: boolean');
    expect(input).toContain('alwaysShowStepper || isFocused');
  });
});
