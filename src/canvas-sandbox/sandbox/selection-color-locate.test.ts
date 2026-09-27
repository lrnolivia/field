import { describe, expect, it } from 'vitest';
import { buildSelectionColorLocateFilter } from './selection-color-locate';

describe('sandbox selection-color locate filter', () => {
  it('preserves an existing authored/computed filter before adding locate shadows', () => {
    const value = buildSelectionColorLocateFilter('blur(2px)', [110, 120, 230], 'white', 1);
    expect(value.startsWith('blur(2px) ')).toBe(true);
    expect(value).toContain('drop-shadow(0 0 0.65px rgba(110, 120, 230, 0.980))');
  });

  it('uses a faint black contrast halo on light backgrounds', () => {
    const value = buildSelectionColorLocateFilter('none', [210, 100, 100], 'black', 1);
    expect(value).toContain('rgba(0, 0, 0, 0.160)');
  });
});
