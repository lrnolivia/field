// src/editor/mobile-toolbar.test.ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/BottomToolbar.tsx'), 'utf8');

describe('mobile Focus toolbar presentation', () => {
  it('uses geometry rather than device-name detection', () => {
    expect(source).toContain("const NARROW_TOOLBAR_QUERY = '(max-width: 600px)'");
    expect(source).not.toContain('isPhone');
    expect(source).not.toContain('iPhone');
  });

  it('collapses to one active-tool launcher in narrow geometry', () => {
    expect(source).toContain('data-mobile-toolbar-launcher');
    expect(source).toContain('<ActiveMobileToolGlyph');
    expect(source).toContain('setCompactToolbarOpen(true)');
  });

  it('keeps the expanded surface safe-area aware', () => {
    expect(source).toContain("env(safe-area-inset-bottom, 0px)");
    expect(source).toContain('data-mobile-toolbar-expanded');
  });

  it('leaves the wide toolbar path intact', () => {
    expect(source).toContain("bottom: isNarrowToolbar ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : 18");
    expect(source).toContain('id="bottom-toolbar-container"');
  });
});
