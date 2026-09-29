import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const prefs = fs.readFileSync(path.resolve(process.cwd(), 'src/code/stores/user-preferences-store.ts'), 'utf8');
const theme = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/builder-theme.ts'), 'utf8');
const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');
const heading = fs.readFileSync(path.resolve(process.cwd(), 'src/design-system/UiHeadingText.tsx'), 'utf8');
const toolSection = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/controls/ToolSection.tsx'), 'utf8');

describe('lowercase headings preference', () => {
  it('is a persisted per-user boolean that defaults on', () => {
    expect(prefs).toContain('lowercaseHeadingsAtom');
    expect(prefs).toContain("'field:prefs:lowercaseHeadings', true");
    expect(theme).toContain('root.dataset.lowercaseHeadings');
  });

  it('is exposed as one toggle in General → Appearance', () => {
    expect(settings).toContain('label="Lowercase headings"');
    expect(settings).toContain('value={lowercaseHeadings}');
    expect(settings).not.toContain('UI heading case');
    expect(settings).not.toContain("label: 'Brand'");
    expect(settings).not.toContain("label: 'Original'");
  });

  it('formats canonical heading text through a shared presentation primitive', () => {
    expect(heading).toContain('formatUiHeading(children, lowercase)');
    expect(toolSection).toContain('<UiHeadingText>{title}</UiHeadingText>');
  });
});
