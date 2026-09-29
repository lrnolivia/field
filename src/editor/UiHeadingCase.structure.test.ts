import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const prefs = fs.readFileSync(path.resolve(process.cwd(), 'src/code/stores/user-preferences-store.ts'), 'utf8');
const theme = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/builder-theme.ts'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/globals.css'), 'utf8');
const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');
const toolSection = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/controls/ToolSection.tsx'), 'utf8');
const button = fs.readFileSync(path.resolve(process.cwd(), 'src/design-system/Button.tsx'), 'utf8');
const menu = fs.readFileSync(path.resolve(process.cwd(), 'src/design-system/DropdownMenu.tsx'), 'utf8');
const sectionLabel = fs.readFileSync(path.resolve(process.cwd(), 'src/design-system/SectionLabel.tsx'), 'utf8');

describe('field UI casing preference', () => {
  it('persists per-user and paints a root case mode', () => {
    expect(prefs).toContain('uiHeadingCaseAtom');
    expect(prefs).toContain("'field:prefs:uiHeadingCase'");
    expect(theme).toContain('root.dataset.uiHeadingCase');
  });

  it('exposes casing as one on/off switch', () => {
    expect(settings).toContain('label="Case management"');
    expect(settings).toContain("value={uiHeadingCase === 'brand'}");
    expect(settings).toContain("enabled ? 'brand' : 'off'");
    expect(settings).not.toContain("label: 'Brand'");
    expect(settings).not.toContain("label: 'Original'");
    expect(settings).not.toContain("value: 'lowercase'");
  });

  it('keeps existing heading opt-ins and extends Brand casing to shared chrome', () => {
    expect(css).toContain("[data-ui-heading='brand']");
    expect(toolSection).toContain('data-ui-heading={getUiHeadingRole(title)}');
    expect(button).toContain('useUiChromeCase');
    expect(menu).toContain('useUiChromeCase');
    expect(sectionLabel).toContain('useUiChromeCase');
  });
});
