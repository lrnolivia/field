import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const picker = readFileSync(resolve(process.cwd(), 'src/editor/ui/ColorPicker.tsx'), 'utf8');
const fill = readFileSync(resolve(process.cwd(), 'src/editor/tools/StylesTool/atoms/FillControl.tsx'), 'utf8');

describe('Fill color picker page colors', () => {
  it('reuses the existing Selection colors aggregator for page-scoped colors', () => {
    expect(fill).toContain("import { aggregateSelectionColors } from '@/editor/selection-colors'");
    expect(fill).toContain('const pageColors = useNodesComputed');
    expect(fill).toContain('aggregateSelectionColors(roots, nodes');
  });

  it('shows On this page only in the Custom color editor', () => {
    expect(picker).toContain('On this page');
    expect(picker).toContain('Colors on this page');
    expect(picker).toContain('!libraryOnly && pageColors.length > 0');
    expect(fill).toContain("pageColors={surface === 'custom' ? pageColors : []}");
  });

  it('applies the semantic/raw value while allowing a resolved token swatch', () => {
    expect(picker).toContain('background: pageColor.swatch || pageColor.value');
    expect(picker).toContain('onChange(pageColor.value)');
    expect(fill).toContain("group.value.startsWith('var(') ? resolveCssTokens(group.value, colorPresets) : group.value");
  });
});
