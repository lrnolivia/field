import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Stroke options panel', () => {
  it('uses the canonical options grammar for box strokes without inventing unsupported vector semantics', () => {
    const border = read('src/editor/tools/StylesTool/atoms/BorderControl.tsx');
    expect(border).toContain("useEditorPanel('Stroke'");
    expect(border).toContain("{ kind: 'options', width: 288 }");
    expect(border).toContain('<PaintOptionRow');
    expect(border).toContain('<ScalarRow');
    expect(border).toContain('label="Sides"');
    expect(border).toContain('Individual sides');
    expect(border).not.toContain('strokeLinecap');
    expect(border).not.toContain('strokeLinejoin');
    expect(border).not.toContain('strokeDasharray');
  });

  it('keeps text stroke as a reduced source-backed subset of the same grammar', () => {
    const textStroke = read('src/editor/tools/TextStyleTool/atoms/StrokeControl.tsx');
    expect(textStroke).toContain('kind="options"');
    expect(textStroke).toContain('<PaintOptionRow');
    expect(textStroke).toContain('<ScalarRow');
    expect(textStroke).toContain('web text-stroke model');
  });
});
