// FIELD_INSPECTOR_COMMAND_MENU_006
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 Inspector shared command-menu contract', () => {
  it('migrates both Size command surfaces to DropdownMenu without bespoke popup shells', () => {
    const size = read('src/editor/tools/SizeTool.tsx');
    expect(size).toContain("from '@/design-system/DropdownMenu'");
    expect(size.match(/<DropdownMenu\b/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(size).toContain('data-dimension-sizing-menu');
    expect(size).toContain('preferredFocusItemId');
    expect(size).not.toContain('z-[10030]');
    expect(size).not.toContain('z-[10031]');
    expect(size).not.toContain('z-[998]');
    expect(size).not.toContain('z-[999]');
  });

  it('migrates Blend and Styles Add to DropdownMenu while preserving effect icons and Normal serialization', () => {
    const styles = read('src/editor/tools/StylesTool/InspectorSectionActions.tsx');
    expect(styles).toContain("from '@/design-system/DropdownMenu'");
    expect(styles.match(/<DropdownMenu\b/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(styles).toContain("opt.value === 'normal' ? '' : opt.value");
    expect(styles).toContain('icon: <EffectMenuIcon label={option.label} />');
    expect(styles).toContain('else onAdd?.();');
    expect(styles).not.toContain('z-[10010]');
    expect(styles).not.toContain('z-[10011]');
    expect(styles).not.toContain('z-[10012]');
    expect(styles).not.toContain('z-[10013]');
  });

  it('keeps Typography Advanced as rich popup UI rather than flattening it into a command menu', () => {
    const typography = read('src/editor/tools/TextStyleTool/TypographyAdvancedPopover.tsx');
    expect(typography).toContain('TypographyAdvancedPopover');
    expect(typography).not.toContain('DropdownMenu');
  });

  it('does not introduce native select or option controls in the migrated Inspector surfaces', () => {
    const migrated = [
      read('src/editor/tools/SizeTool.tsx'),
      read('src/editor/tools/StylesTool/InspectorSectionActions.tsx'),
    ].join('\n');
    expect(migrated).not.toMatch(/<select\b/i);
    expect(migrated).not.toMatch(/<option\b/i);
  });
});
