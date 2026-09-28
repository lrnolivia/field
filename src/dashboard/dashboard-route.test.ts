import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveFieldSurface } from './dashboard-route';

describe('field top-level routing', () => {
  it('routes root and /dashboard to the project browser', () => {
    expect(resolveFieldSurface('/')).toBe('dashboard');
    expect(resolveFieldSurface('/dashboard')).toBe('dashboard');
    expect(resolveFieldSurface('/dashboard/')).toBe('dashboard');
  });

  it('keeps builder project routes in the editor', () => {
    expect(resolveFieldSurface('/builder/local')).toBe('builder');
    expect(resolveFieldSurface('/builder/abc123')).toBe('builder');
    expect(resolveFieldSurface('/work/abc123')).toBe('builder');
  });

  it('keeps ProjectChip navigating through the shared Dashboard shell', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/editor/header/ProjectChip.tsx'), 'utf8');
    expect(source).toContain('void showFieldDashboard()');
  });
});
