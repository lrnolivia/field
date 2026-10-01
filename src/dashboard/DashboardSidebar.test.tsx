import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/loew-figma-icons', () => ({
  FigmaGridIcon: () => <span aria-hidden="true">grid</span>,
  FigmaSearchIcon: () => <span aria-hidden="true">search</span>,
}));

import DashboardSidebar from './DashboardSidebar';

function renderSidebar({
  view = 'recents',
  query = '',
  onViewChange = vi.fn(),
  onQueryChange = vi.fn(),
}: {
  view?: 'recents' | 'all' | 'starred' | 'trash';
  query?: string;
  onViewChange?: (view: 'recents' | 'all' | 'starred' | 'trash') => void;
  onQueryChange?: (query: string) => void;
} = {}) {
  render(
    <DashboardSidebar
      view={view}
      query={query}
      user={null}
      onViewChange={onViewChange}
      onQueryChange={onQueryChange}
    />,
  );

  return { onViewChange, onQueryChange };
}

describe('DashboardSidebar navigation semantics', () => {
  it('marks only the active project view as current', () => {
    renderSidebar({ view: 'starred' });

    expect(screen.getByRole('button', { name: 'Starred' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Recents' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'All projects' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'Trash' }).getAttribute('aria-current')).toBeNull();
  });

  it('preserves view-change behavior', () => {
    const onViewChange = vi.fn();
    renderSidebar({ onViewChange });

    fireEvent.click(screen.getByRole('button', { name: 'Trash' }));

    expect(onViewChange).toHaveBeenCalledWith('trash');
  });

  it('clears a non-empty search with Escape and keeps focus in search', () => {
    const onQueryChange = vi.fn();
    renderSidebar({ query: 'portfolio', onQueryChange });

    const search = screen.getByRole('searchbox', { name: 'Search projects' });
    search.focus();
    fireEvent.keyDown(search, { key: 'Escape' });

    expect(onQueryChange).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(search);
  });

  it('does not emit a redundant clear for an empty search', () => {
    const onQueryChange = vi.fn();
    renderSidebar({ query: '', onQueryChange });

    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search projects' }), { key: 'Escape' });

    expect(onQueryChange).not.toHaveBeenCalled();
  });
});
