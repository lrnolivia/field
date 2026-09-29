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
    expect(fillSource).toContain("title: 'Pattern'");
    expect(fillSource).toContain("title: 'Image'");
    expect(fillSource).toContain("title: 'Video'");
    expect(fillSource).toContain("title: 'Shader'");
  });

  it('reuses the existing preset surfaces instead of creating a second library system', () => {
    expect(fillSource).toContain('libraryOnly');
    expect(fillSource).toContain('<AssetPresetGrid');
    expect(colorSource).toContain('showPresets');
    expect(colorSource).toContain('libraryOnly');
  });

  it('keeps the canonical paint-type order in one shared rail', () => {
    const start = fillSource.indexOf('const paintTypeButtons');
    const end = fillSource.indexOf('return (', start);
    const railBlock = fillSource.slice(start, end);
    const ids = ['color', 'gradient', 'pattern', 'image', 'video', 'shader'];
    let cursor = -1;
    for (const id of ids) {
      const next = railBlock.indexOf(`id: '${id}'`);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  it('keeps semantic Pattern, Video, and Shader fills in Single mode until the paint stack owns them natively', () => {
    expect(fillSource).toContain('const semanticSingleFill = hasSemanticSingleFill(ctx?.node)');
    expect(fillSource).toContain("node?.attrs?.['data-field-pattern']");
    expect(fillSource).toContain("node?.attrs?.['data-field-shader-fill']");
    expect(fillSource).toContain('node?.bgVideo');
    expect(fillSource).toContain('!semanticSingleFill && (');
  });

  it('re-detects the selected paint type after undo/redo on the same node', () => {
    expect(fillSource).toContain("const typeSig = solidOnly ? 'color' : fillTypeSignature(styles, node)");
    expect(fillSource).toContain('[nodeId, solidOnly, typeSig]');
  });
});
