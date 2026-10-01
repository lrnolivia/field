import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
describe('2026-09-30 UI hotfix source contracts', () => {
  it('owns compact geometry in the launcher and picker without global overrides', () => {
    expect(read('src/editor/controls/ColorInput.tsx')).toContain('width={304}');
    expect(read('src/editor/ui/ColorPicker.tsx')).toContain('w-full h-[176px]');
    expect(read('src/editor/ui/PaintPickerShell.tsx')).toContain('data-paint-picker-density="compact"');
    expect(read('src/editor/bottom-toolbar-glyphs.css')).not.toContain('!important');
  });
  it('preserves nested floating color launchers', () => {
    const input = read('src/editor/controls/ColorInput.tsx');
    expect(input).toContain('nested={!!popupCtx}');
    expect(input).toContain('<StandaloneColorPickerWithPresets');
    expect(input).not.toContain("popupCtx.pushPanel('Color'");
  });
  it('shares one names-only action card between Media and toolbar', () => {
    expect(read('src/editor/BottomToolbar.tsx')).toContain('<MediaActionCard context="toolbar"');
    const media = read('src/editor/media/MediaLauncher.tsx');
    expect(media).toContain('<MediaActionCard');
    expect(media).toContain('context="media"');
    expect(media).not.toContain('description:');
    expect(read('src/editor/media/MediaActionCard.tsx')).toContain('flex h-9 min-w-0 items-center gap-1.5');
  });
  it('owns the avatar-to-Publish surface in the Inspector header', () => {
    const header = read('src/editor/header/RightHeader.tsx');
    expect(header).toContain('data-workspace-right-header');
    expect(header).toContain('<InspectorCollaborators');
    expect(header).toContain('data-tutorial="header-publish-button"');
    expect(header).toContain('border-b border-[var(--border-light)] bg-[var(--bg-panel)]');
  });
});
