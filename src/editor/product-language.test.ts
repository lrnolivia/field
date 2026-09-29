import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('field product language', () => {
  it('uses canonical structural names in visible chrome', () => {
    const logo = read('src/editor/header/LeftHeader.tsx');
    const rail = read('src/editor/left-toolbar/LeftMenu.tsx');
    const modes = read('src/editor/WorkspaceModeButton.tsx');
    expect(logo).toContain("label: 'home'");
    expect(logo).toContain("label: 'appearance'");
    expect(logo).not.toContain("label: 'Go to Dashboard'");
    expect(rail).toContain('title="media"');
    expect(rail).toContain('title="pages & layers"');
    expect(rail).not.toContain('title="Media Gallery"');
    expect(rail).toContain('aria-label="AI assistant"');
    expect(rail).toContain('title="CMS"');
    expect(modes).toContain("label: 'full'");
    expect(modes).toContain("label: 'focus'");
    expect(modes).toContain("label: 'float'");
  });

  it('uses authored action names where the interaction earns one', () => {
    const selection = read('src/editor/tools/SelectionTool.tsx');
    const picker = read('src/editor/ui/ColorPicker.tsx');
    expect(selection).toContain('title="locate"');
    expect(picker).toContain('title="pick"');
  });

  it('keeps core surface labels lowercase', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const about = read('src/editor/ui/AboutFieldModal.tsx');
    expect(media).toContain('>media</SectionLabel>');
    expect(about).toContain('label="version"');
    expect(about).toContain('title="About field"');
    const menu = read('src/editor/header/menu-builders.tsx');
    expect(menu).toContain("label: 'SEO'");
    const settings = read('src/editor/overlays/SettingsOverlay.tsx');
    expect(settings).toContain('label="Case management"');
    expect(settings).toContain("value={uiHeadingCase === 'brand'}");
    expect(settings).toContain("enabled ? 'brand' : 'off'");
    expect(settings).not.toContain("label: 'Brand'");
    expect(settings).not.toContain("label: 'Original'");
    expect(settings).not.toContain("value: 'lowercase'");
  });
});
