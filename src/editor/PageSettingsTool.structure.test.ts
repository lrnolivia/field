import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSettingsSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/editor/tools/PageSettingsTool.tsx'),
  'utf8',
);
const explorerSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/editor/FileExplorer.tsx'),
  'utf8',
);

describe('Page Settings inspector architecture', () => {
  it('keeps page-level settings contextual to the Inspector', () => {
    expect(pageSettingsSource).toContain('data-page-settings-panel');
    expect(pageSettingsSource).toContain('<PageAppearanceTool />');
    expect(pageSettingsSource).toContain('<TemplatePicker />');
    expect(pageSettingsSource).toContain('title="Route"');
    expect(pageSettingsSource).toContain('title="SEO"');
    expect(pageSettingsSource).toContain('title="Social"');
    expect(pageSettingsSource).toContain('title="Search engines"');
  });

  it('opens Page settings by revealing the Inspector instead of the global Settings overlay', () => {
    const start = explorerSource.indexOf('onOpenPageSettings={(filePath) => {');
    expect(start).toBeGreaterThan(-1);
    const block = explorerSource.slice(start, start + 900);
    expect(block).toContain('setRightPaneOpen(true)');
    expect(block).toContain('setSelectedIds([])');
    expect(block).not.toContain("setSettingsSection('pages')");
    expect(block).not.toContain('setSettingsOpen(true)');
  });
});
