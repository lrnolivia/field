import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');
const shared = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/settings-shared.tsx'), 'utf8');
const page = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/tools/PageSettingsTool.tsx'), 'utf8');
const appearance = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/tools/PageAppearanceTool.tsx'), 'utf8');

describe('settings visual hierarchy', () => {
  it('keeps General compact, grouped, and field-native', () => {
    expect(settings).toContain('max-w-[760px]');
    expect(settings).toContain('surface\n            title="Site metadata"');
    expect(settings).toContain('tracking-[0.08em] text-[var(--text-tertiary)]');
    expect(shared).toContain('surface = false');
    expect(shared).toContain('cut-corners cut-lg cut-border');
  });

  it('gives Page Settings a page context header and stacked metadata fields', () => {
    expect(page).toContain('data-page-settings-header');
    expect(page).toContain('data-page-settings-field');
    expect(page).toContain('Search preview');
    expect(page).toContain('Open Graph');
    expect(page).toContain('X / Twitter');
    expect(appearance).toContain('<ToolSection title="Canvas">');
  });
});
