import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const prefs = fs.readFileSync(path.resolve(process.cwd(), 'src/code/stores/user-preferences-store.ts'), 'utf8');
const theme = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/builder-theme.ts'), 'utf8');
const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');
const heading = fs.readFileSync(path.resolve(process.cwd(), 'src/design-system/UiHeadingText.tsx'), 'utf8');
const button = fs.readFileSync(path.resolve(process.cwd(), 'src/design-system/Button.tsx'), 'utf8');
const menu = fs.readFileSync(path.resolve(process.cwd(), 'src/design-system/DropdownMenu.tsx'), 'utf8');
const sectionLabel = fs.readFileSync(path.resolve(process.cwd(), 'src/design-system/SectionLabel.tsx'), 'utf8');

describe('Brand casing preference', () => {
  it('is a persisted per-user boolean that defaults on', () => {
    expect(prefs).toContain('lowercaseHeadingsAtom');
    expect(prefs).toContain("'field:prefs:lowercaseHeadings', true");
    expect(theme).toContain('root.dataset.lowercaseHeadings');
  });

  it('is exposed as one Brand casing toggle', () => {
    expect(settings).toContain('label="Brand casing"');
    expect(settings).toContain('value={lowercaseHeadings}');
    expect(settings).not.toContain("value: 'lowercase'");
    expect(settings).not.toContain("label: 'Original'");
  });

  it('formats headings and shared field-owned chrome through the same grammar', () => {
    expect(heading).toContain('formatUiHeading(children, lowercase)');
    expect(button).toContain('useUiChromeText');
    expect(menu).toContain('useUiChromeText');
    expect(sectionLabel).toContain('useUiChromeText');
  });
});
