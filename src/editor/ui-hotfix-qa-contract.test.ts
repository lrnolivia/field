import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('2026-09-30 user-verified UI hotfix QA', () => {
  it('treats PaintPicker compactness as a rendered-geometry requirement', () => {
    const shell = read('src/editor/ui/PaintPickerShell.tsx');
    const css = read('src/editor/bottom-toolbar-glyphs.css');
    expect(shell).toContain('data-paint-picker-density="compact"');
    expect(css).toContain(':has([data-paint-picker-density="compact"])');
    expect(css).toContain('width: 304px !important');
    expect(css).toContain('height: 176px !important');
  });

  it('preserves the already-working nested color launcher behavior', () => {
    const input = read('src/editor/controls/ColorInput.tsx');
    expect(input).toContain('nested={!!popupCtx}');
    expect(input).toContain('<StandaloneColorPickerWithPresets');
    expect(input).not.toContain("popupCtx.pushPanel('Color'");
  });

  it('keeps toolbar and Media action cards on one compact geometry with names only', () => {
    const media = read('src/editor/media/MediaLauncher.tsx');
    const css = read('src/editor/bottom-toolbar-glyphs.css');
    expect(media).toContain('flex h-9 min-w-0 items-center gap-1.5');
    expect(media).not.toContain('description:');
    expect(media).not.toContain('card.description');
    expect(css).toContain('#bottom-toolbar-container [data-toolbar-menu-tile],');
    expect(css).toContain('[data-media-launcher-card]');
    expect(css).toContain('height: 36px');
    expect(css).toContain('width: 24px');
  });

  it('renders the avatar-to-Publish row as Inspector shell chrome', () => {
    const header = read('src/editor/header/RightHeader.tsx');
    const css = read('src/editor/bottom-toolbar-glyphs.css');
    expect(header).toContain('data-workspace-right-header');
    expect(header).toContain('<InspectorCollaborators');
    expect(header).toContain('data-tutorial="header-publish-button"');
    expect(css).toContain('[data-workspace-right-header]');
    expect(css).toContain('background: var(--bg-panel)');
    expect(css).toContain('border-bottom: 1px solid var(--border-light)');
  });
});
