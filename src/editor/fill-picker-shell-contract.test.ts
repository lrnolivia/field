// FILL_PICKER_SHELL_CONTRACT_20260929
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fillSource = readFileSync(
  new URL('./tools/StylesTool/atoms/FillControl.tsx', import.meta.url),
  'utf8',
);
const colorSource = readFileSync(new URL('./ui/ColorPicker.tsx', import.meta.url), 'utf8');

describe('fill picker shell contract', () => {
  it('reuses field inspector primitives for Custom/Libraries and the paint type rail', () => {
    expect(fillSource).toContain("value={surface}");
    expect(fillSource).toContain("{ value: 'custom', label: 'Custom' }");
    expect(fillSource).toContain("{ value: 'libraries', label: 'Libraries' }");
    expect(fillSource).toContain('<InspectorIconButtonGroup');
    expect(fillSource).toContain("title: 'Solid'");
    expect(fillSource).toContain("title: 'Gradient'");
    expect(fillSource).toContain("title: 'Image'");
    expect(fillSource).toContain("title: 'Video'");
  });

  it('reuses the existing preset surfaces instead of creating a second library system', () => {
    expect(fillSource).toContain('libraryOnly');
    expect(fillSource).toContain('<AssetPresetGrid');
    expect(colorSource).toContain('showPresets');
    expect(colorSource).toContain('libraryOnly');
  });

  it('does not expose Pattern or Shader before canonical Fill paths exist', () => {
    const start = fillSource.indexOf('const paintTypeButtons');
    const end = fillSource.indexOf('return (', start);
    const railBlock = fillSource.slice(start, end);
    expect(railBlock).not.toContain("id: 'pattern'");
    expect(railBlock).not.toContain("id: 'shader'");
  });
});
