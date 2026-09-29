import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const prefs = fs.readFileSync(path.resolve(process.cwd(), 'src/code/stores/user-preferences-store.ts'), 'utf8');
const theme = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/builder-theme.ts'), 'utf8');
const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');
const heading = fs.readFileSync(path.resolve(process.cwd(), 'src/design-system/UiHeadingText.tsx'), 'utf8');
const shared = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/settings-shared.tsx'), 'utf8');

describe('field case management preference', () => {
  it('persists as one on/off preference and remains enabled by default', () => {
    expect(prefs).toContain('caseManagementAtom');
    expect(prefs).toContain("'field:prefs:lowercaseHeadings', true");
    expect(theme).toContain('root.dataset.lowercaseHeadings');
  });

  it('exposes one switch, never Brand vs Original modes', () => {
    expect(settings).toContain('label="Case management"');
    expect(settings).toContain('value={caseManagement}');
    expect(settings).toContain('onChange={setCaseManagement}');
    expect(settings).not.toContain("label: 'Brand'");
    expect(settings).not.toContain("label: 'Original'");
    expect(settings).not.toContain('UI heading case');
  });

  it('uses the shared manager for headings and settings chrome', () => {
    expect(heading).toContain('caseManagementAtom');
    expect(shared).toContain('useUiChromeCase');
  });
});
