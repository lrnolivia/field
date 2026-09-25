import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveFieldSurface } from './dashboard-route';

describe('field top-level routing', () => {
  it('routes root and /dashboard to the project browser', () => {
    expect(resolveFieldSurface('/')).toBe('dashboard');
    expect(resolveFieldSurface('/dashboard')).toBe('dashboard');
  });

  it('keeps builder project routes in the editor', () => {
    expect(resolveFieldSurface('/builder/local')).toBe('builder');
    expect(resolveFieldSurface('/builder/abc123')).toBe('builder');
  });

  it('keeps ProjectChip pointed at canonical root dashboard through leaveBuilderTo', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/editor/header/ProjectChip.tsx'), 'utf8');
    expect(source).toContain("leaveBuilderTo('/', 'project-chip-dashboard')");
  });
});
