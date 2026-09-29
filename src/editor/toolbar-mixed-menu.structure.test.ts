import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const source = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/BottomToolbar.tsx'), 'utf8');
describe('toolbar mixed menu composition', () => {
  it('removes separate list/icon menu modes', () => {
    expect(source).not.toContain('type MenuView');
    expect(source).not.toContain('function MenuViewToggle');
    expect(source).not.toContain('<MenuViewToggle');
  });
  it('uses small visual cards selectively inside otherwise list-based menus', () => {
    expect(source).toContain('data-toolbar-mixed-cards');
    expect(source).toContain('h-8 w-10');
    expect((source.match(/data-toolbar-mixed-cards/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('<MenuItem label="Section library…"');
    expect(source).toContain('<MenuItem label="Text Effects…"');
  });
});
