import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveMobileWorkspacePresentation,
  PHONE_LANDSCAPE_MAX_HEIGHT,
  PHONE_LANDSCAPE_MAX_WIDTH,
  PHONE_PORTRAIT_MAX_WIDTH,
} from './mobile-workspace-presentation';

describe('mobile workspace presentation', () => {
  it('uses bottom sheets for narrow portrait geometry', () => {
    expect(resolveMobileWorkspacePresentation(390, 844)).toBe('portrait-sheet');
    expect(resolveMobileWorkspacePresentation(430, 932)).toBe('portrait-sheet');
    expect(resolveMobileWorkspacePresentation(PHONE_PORTRAIT_MAX_WIDTH, 900))
      .toBe('portrait-sheet');
  });

  it('uses edge overlays for phone landscape geometry', () => {
    expect(resolveMobileWorkspacePresentation(844, 390)).toBe('landscape-overlay');
    expect(resolveMobileWorkspacePresentation(
      PHONE_LANDSCAPE_MAX_WIDTH,
      PHONE_LANDSCAPE_MAX_HEIGHT,
    )).toBe('landscape-overlay');
  });

  it('leaves tablet and desktop presentation alone', () => {
    expect(resolveMobileWorkspacePresentation(768, 1024)).toBe('regular');
    expect(resolveMobileWorkspacePresentation(1024, 768)).toBe('regular');
    expect(resolveMobileWorkspacePresentation(1440, 900)).toBe('regular');
  });

  it('keeps shared panel content and only changes the host presentation', () => {
    const root = path.resolve(process.cwd(), 'src');
    const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
    const floating = fs.readFileSync(path.join(root, 'editor/FloatingLeftPanelHost.tsx'), 'utf8');
    const toolbar = fs.readFileSync(path.join(root, 'editor/ToolbarPanelHost.tsx'), 'utf8');

    expect(app).toContain('useMobileWorkspacePresentation');
    expect(app).toContain('data-mobile-panel-presentation');
    expect(floating).toContain('<Panel />');
    expect(floating).toContain("presentation === 'portrait-sheet'");
    expect(toolbar).toContain('<LibraryPanel');
    expect(toolbar).toContain('<SecondaryPanelContent');
    expect(toolbar).toContain("mobilePresentation === 'portrait-sheet'");
    expect(toolbar).toContain('env(safe-area-inset-bottom, 0px)');
  });
});
