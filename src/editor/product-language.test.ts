import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('field product language', () => {
  it('uses the settled structural product nouns', () => {
    const logo = read('src/editor/header/LeftHeader.tsx');
    const rail = read('src/editor/left-toolbar/LeftMenu.tsx');
    expect(logo).toContain("label: 'home'");
    expect(logo).toContain("label: 'account'");
    expect(logo).toContain("label: 'appearance'");
    expect(logo).not.toContain("label: 'Go to Dashboard'");
    expect(rail).toContain('title="media"');
    expect(rail).not.toContain('title="Media Gallery"');
  });

  it('uses named interaction copy only where it earns a name', () => {
    expect(read('src/editor/tools/SelectionTool.tsx')).toContain('title="locate"');
    expect(read('src/editor/ui/ColorPicker.tsx')).toContain('title="pick"');
  });

  it('keeps case management as one switch instead of visible modes', () => {
    const settings = read('src/editor/overlays/SettingsOverlay.tsx');
    expect(settings).toContain('label="Case management"');
    expect(settings).toContain('value={caseManagement}');
    expect(settings).toContain('onChange={setCaseManagement}');
    expect(settings).not.toContain("label: 'Brand'");
    expect(settings).not.toContain("label: 'Original'");
  });
});
