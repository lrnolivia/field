import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Inspector Options Panel foundation', () => {
  it('keeps legacy ToolPopup geometry opt-in while options panels use the wider canonical shell', () => {
    const popup = read('src/editor/ui/ToolPopup.tsx');
    expect(popup).toContain("export type ToolPopupKind = 'default' | 'options'");
    expect(popup).toContain("kind === 'options' ? 280 : 260");
    expect(popup).toContain('"w-full flex-shrink-0 px-3 pb-3 pt-1.5');
  });

  it('exposes the shared options-panel row grammar', () => {
    const panel = read('src/editor/ui/OptionsPanel.tsx');
    for (const name of ['OptionsPanel', 'OptionSection', 'ScalarRow', 'ChoiceRow', 'PaintOptionRow', 'SpatialRow', 'OptionEntryRow']) {
      expect(panel).toContain(`export function ${name}`);
    }
  });

  it('promotes Background blur from a list numeric field into a canonical scalar popout', () => {
    const blur = read('src/editor/tools/StylesTool/atoms/BackdropFilterControl.tsx');
    expect(blur).toContain("useEditorPanel(");
    expect(blur).toContain("{ kind: 'options' }");
    expect(blur).toContain('<ScalarRow');
    expect(blur).toContain('unit="px"');
    expect(blur).toContain('Reset blur');
  });
});
