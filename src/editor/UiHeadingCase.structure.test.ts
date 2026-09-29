import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const prefs = fs.readFileSync(path.resolve(process.cwd(), 'src/code/stores/user-preferences-store.ts'), 'utf8');
const theme = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/builder-theme.ts'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/globals.css'), 'utf8');
const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');
const toolSection = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/controls/ToolSection.tsx'), 'utf8');

describe('system UI heading case preference', () => {
  it('persists per-user and paints a root case mode', () => {
    expect(prefs).toContain('uiHeadingCaseAtom');
    expect(prefs).toContain("'field:prefs:uiHeadingCase'");
    expect(theme).toContain('root.dataset.uiHeadingCase');
  });

  it('exposes the selector in General → Appearance', () => {
    expect(settings).toContain('label="UI heading case"');
    expect(settings).toContain("value: 'brand', label: 'Brand'");
    expect(settings).toContain("value: 'original', label: 'Original'");
    expect(settings).toContain("value: 'lowercase', label: 'lowercase'");
  });

  it('limits case transforms to explicitly marked headings', () => {
    expect(css).toContain("[data-ui-heading='brand']");
    expect(css).toContain("[data-ui-heading='standard']");
    expect(toolSection).toContain('data-ui-heading={getUiHeadingRole(title)}');
  });
});
