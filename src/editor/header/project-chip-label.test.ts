import { describe, expect, it } from 'vitest';
import { getHeaderPageLabel } from './project-chip-label';

describe('getHeaderPageLabel', () => {
  it('uses Home for the root route', () => {
    expect(getHeaderPageLabel('/')).toBe('Home');
  });

  it('uses the leaf label for nested routes', () => {
    expect(getHeaderPageLabel('/projects/terra-prime')).toBe('terra-prime');
  });

  it('keeps non-route labels intact', () => {
    expect(getHeaderPageLabel('Component')).toBe('Component');
    expect(getHeaderPageLabel('')).toBe('');
  });
});
