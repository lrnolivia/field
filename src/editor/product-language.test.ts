import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('field product language', () => {
  it('uses settled structural names where semantics changed', () => {
    const logo = read('src/editor/header/LeftHeader.tsx');
    const rail = read('src/editor/left-toolbar/LeftMenu.tsx');
    const right = read('src/editor/header/RightHeader.tsx');
    expect(logo).toContain("label: 'home'");
    expect(logo).toContain("label: 'appearance'");
    expect(rail).toContain('title="media"');
    expect(right).toContain('aria-label="move inspector"');
  });

  it('uses authored interaction names for locate and pick', () => {
    expect(read('src/editor/tools/SelectionTool.tsx')).toContain('title="locate"');
    expect(read('src/editor/ui/ColorPicker.tsx')).toContain('title="pick"');
  });

  it('exposes one Brand casing switch instead of three casing modes', () => {
    const settings = read('src/editor/overlays/SettingsOverlay.tsx');
    expect(settings).toContain('label="Brand casing"');
    expect(settings).not.toContain("value: 'lowercase'");
    expect(settings).not.toContain("label: 'Original'");
  });
});
