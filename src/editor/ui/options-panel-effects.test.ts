// OPTIONS_PANEL_EFFECTS_SYNCED
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Options panel effect migration', () => {
  it('migrates Shadow into semantic option sections', () => {
    const shadow = read('src/editor/tools/StylesTool/atoms/ShadowControl.tsx');
    expect(shadow).toContain("{ kind: 'options' }");
    expect(shadow).toContain('<SpatialRow label="Offset">');
    expect(shadow).toContain('label="Blur"');
    expect(shadow).toContain('<PaintOptionRow');
  });

  it('migrates CSS filter controls to shared scalar rows', () => {
    const filter = read('src/editor/tools/StylesTool/atoms/FilterControl.tsx');
    expect(filter).toContain("{ kind: 'options' }");
    for (const label of ['Blur', 'Brightness', 'Contrast', 'Saturate', 'Grayscale', 'Hue rotate']) {
      expect(filter).toContain(`label="${label}"`);
    }
  });

  it('gives Fill the canonical options shell while preserving deep fill editors', () => {
    const fill = read('src/editor/tools/StylesTool/atoms/FillControl.tsx');
    expect(fill).toContain("{ width: 288, kind: 'options' }");
    expect(fill).toContain('<OptionsPanel>');
    expect(fill).toContain('<SingleModeFillContent');
    expect(fill).toContain('<MultiModeFillContent');
  });
});
