import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const source = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/BottomToolbar.tsx'), 'utf8');
const glyphCss = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/bottom-toolbar-glyphs.css'), 'utf8');
describe('toolbar mixed menu composition', () => {
  it('removes separate list/icon menu modes', () => {
    expect(source).not.toContain('type MenuView');
    expect(source).not.toContain('function MenuViewToggle');
    expect(source).not.toContain('<MenuViewToggle');
  });
  it('uses small visual cards selectively inside otherwise list-based menus', () => {
    expect(source).toContain('data-toolbar-mixed-cards');
    expect(source).toContain('data-toolbar-card-style="media"');
    expect(source).toContain('flex h-9 min-w-0 items-center gap-1.5');
    expect(source).toContain('h-6 w-6 shrink-0 items-center justify-center rounded-[7px]');
    expect(glyphCss).not.toContain('height: 96px');
    expect(glyphCss).toContain('#bottom-toolbar-container [data-toolbar-menu-tile],');
    expect(glyphCss).toContain('[data-media-launcher-card]');
    expect(glyphCss).toContain('height: 36px');
    expect(source).not.toContain('flex-col items-center justify-center gap-1.5');
    expect((source.match(/data-toolbar-mixed-cards/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('<MenuItem label="Section library…"');
    expect(source).toContain('<MenuItem label="Text Effects…"');
  });
});
