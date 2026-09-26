import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('field shell Dashboard/Canvas motion contract', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src/styles/field-shell.css'), 'utf8');
  const shell = fs.readFileSync(path.join(process.cwd(), 'src/FieldShell.tsx'), 'utf8');

  it('uses a readable staggered split-slide with a playful settle and no fade', () => {
    expect(css).toContain('transform 360ms cubic-bezier(.2, 1.12, .3, 1)');
    expect(css).toContain('transform 420ms cubic-bezier(.18, 1.1, .24, 1)');
    expect(css).toContain(".field-dashboard-layer[data-state='hiding'] .field-dashboard-sidebar");
    expect(css).toContain(".field-dashboard-layer[data-state='hiding'] .field-dashboard-main");
    expect(css).toContain('transition-delay: 42ms');
    expect(css).toContain('translate3d(calc(-100% - 12px), 0, 0)');
    expect(css).toContain('translate3d(calc(100% + 12px), 0, 0)');
    expect(css).not.toContain('opacity 180ms cubic-bezier');
    expect(css).not.toContain('transition: transform 150ms');
  });

  it('keeps the reveal fence beyond the longest delayed transform', () => {
    expect(shell).toContain('}, 480);');
  });

  it('retains reduced-motion handling', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition-duration: 0ms');
    expect(css).toContain('transition-delay: 0ms');
  });

  it('waits for editor chrome to leave before Dashboard begins its return slide', () => {
    const exitIndex = shell.indexOf('await requestEditorChromeExit(document);');
    const showIndex = shell.indexOf('showDashboardLayer();', exitIndex);
    expect(exitIndex).toBeGreaterThan(-1);
    expect(showIndex).toBeGreaterThan(exitIndex);
    expect(shell).toContain("trace.action('field-shell:editor-exit-start'");
    expect(shell).toContain("trace.action('field-shell:editor-exit-complete'");
  });
});
