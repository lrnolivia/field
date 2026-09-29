import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('left rail and floating panel geometry', () => {
  it('keeps bottom utilities outside the scroll hit-area', () => {
    const rail = read('src/editor/left-toolbar/LeftMenu.tsx');
    expect(rail).toContain('data-left-rail-main-tools');
    expect(rail).toContain('data-left-rail-bottom-controls');
    expect(rail).toContain('shrink-0');
    expect(rail).toContain('pointer-events-auto');
    expect(rail).not.toContain('data-left-rail-bottom-controls className="absolute');
    expect(rail).not.toContain('pb-40');
  });

  it('uses the persisted floating height for both rail and content panel', () => {
    const rail = read('src/editor/left-toolbar/LeftMenu.tsx');
    const panel = read('src/editor/FloatingLeftPanelHost.tsx');
    expect(rail).not.toContain('workspaceMode === \'floating\' ? `calc(100vh');
    expect(panel).not.toContain('mode === \'floating\' ? `calc(100vh');
    expect(panel).toContain('start.height + next.clientY - start.y');
    expect(panel).toContain('cursor-nwse-resize');
  });

  it('keeps the rail above floating panel content', () => {
    const rail = read('src/editor/left-toolbar/LeftMenu.tsx');
    const panel = read('src/editor/FloatingLeftPanelHost.tsx');
    expect(rail).toContain('fixed z-[5002]');
    expect(panel).toContain('fixed z-[5001]');
  });
});
