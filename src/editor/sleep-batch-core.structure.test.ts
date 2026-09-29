import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const read = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
describe('toolbar/media/effects sleep batch core', () => {
  it('uses a left-edge active marker across both tab primitives', () => {
    for (const rel of ['src/editor/ui/ChromeTabBar.tsx', 'src/editor/controls/ToolSegmentedControl.tsx']) {
      const s = read(rel);
      expect(s).toContain('data-active-tab-marker');
      expect(s).toContain('left-[3px]');
      expect(s).toContain('h-3.5 w-[2px]');
      expect(s).not.toContain('bottom-[2px] h-[2px]');
    }
  });
  it('keeps Media on the main toolbar and removes it from Insert categories', () => {
    const toolbar = read('src/editor/BottomToolbar.tsx');
    const insert = read('src/editor/left-toolbar/panels/insert/index.tsx');
    expect(toolbar).toContain('<MediaButton />');
    expect(insert).toContain("CATEGORIES.filter((category) => category.id !== 'media')");
    expect(insert).not.toContain('<MediaGalleryPanel');
  });
  it('gives Media creation routes a larger shell without oversized upload cards', () => {
    const pop = read('src/editor/media/MediaToolbarPopover.tsx');
    expect(pop).toContain("expanded ? 840 : compact ? 224 : 560");
    expect(pop).toContain("min(660px, calc(100vh - 96px))");
    expect(read('src/editor/ui/ImageSearchModal.tsx')).toContain('col-span-3 h-28');
    expect(read('src/editor/ui/VideoSearchModal.tsx')).toContain('h-28 overflow-hidden');
  });
  it('does not let a box shadow blank an unrelated filter effect', () => {
    const u = read('src/editor/ui/shadow-utils.ts');
    const c = read('src/editor/tools/StylesTool/atoms/ShadowControl.tsx');
    expect(u).toContain('export function buildShadowStylePatch');
    expect(u).toContain("entry.type === 'drop'");
    expect(c).toContain('buildShadowStylePatch(withIds, filter)');
  });
  it('keeps Gradient Text shimmer alive in Design and Preview', () => {
    const s = read('src/code/project/default-code-components/GradientText.ts');
    expect(s).toContain('field-gradient-text-shimmer');
    expect(s).not.toContain('useStaticCanvas');
    expect(s).toContain('textShadow: rootStyle.textShadow');
  });
});
