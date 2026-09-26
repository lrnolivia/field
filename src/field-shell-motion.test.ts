import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('field shell Dashboard/Canvas motion contract', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src/styles/field-shell.css'), 'utf8');
  const shell = fs.readFileSync(path.join(process.cwd(), 'src/FieldShell.tsx'), 'utf8');

  it('uses a fast split-slide instead of fading the Dashboard layer', () => {
    expect(css).toContain('transform 150ms cubic-bezier(.22, .85, .3, 1)');
    expect(css).toContain(".field-dashboard-layer[data-state='hiding'] .field-dashboard-sidebar");
    expect(css).toContain(".field-dashboard-layer[data-state='hiding'] .field-dashboard-main");
    expect(css).toContain('translate3d(calc(-100% - 12px), 0, 0)');
    expect(css).toContain('translate3d(calc(100% + 12px), 0, 0)');
    expect(css).not.toContain('opacity 180ms cubic-bezier');
  });

  it('keeps the reveal fence just beyond the transform duration', () => {
    expect(shell).toContain('}, 170);');
  });

  it('retains reduced-motion handling', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition-duration: 0ms');
  });
});
