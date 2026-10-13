import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState semantics', () => {
  it('exposes the empty result as a status with a level-2 heading', () => {
    render(<EmptyState title="No projects found" detail="Try a different search." />);

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('No projects found');
    expect(status.textContent).toContain('Try a different search.');
    expect(screen.getByRole('heading', { level: 2, name: 'No projects found' })).toBeTruthy();
  });
});
