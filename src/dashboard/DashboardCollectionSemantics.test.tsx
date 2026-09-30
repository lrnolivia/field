import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldProjectMeta } from '@/backend/field-projects';
import DashboardHeader from './DashboardHeader';
import DashboardLoadingGrid from './DashboardLoadingGrid';
import ProjectGrid from './ProjectGrid';

const project = {
  id: 'project-1',
  name: 'Portfolio',
  updatedAt: '2026-09-26T12:00:00.000Z',
  thumbnail: null,
  starred: false,
  trashedAt: null,
} as FieldProjectMeta;

const actions = {
  onOpen: vi.fn(),
  onRename: vi.fn(),
  onDuplicate: vi.fn(),
  onToggleStar: vi.fn(),
  onTrash: vi.fn(),
  onRestore: vi.fn(),
  onPermanentDelete: vi.fn(),
};

describe('Dashboard collection semantics', () => {
  it('exposes the project grid as a list with project cards as list items', () => {
    render(
      <ProjectGrid
        projects={[project]}
        refreshingProjectIds={new Set()}
        openMenuId={null}
        openingProjectId={null}
        onOpenMenuId={vi.fn()}
        {...actions}
      />,
    );

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });

  it('gives the visible project count contextual singular and plural names', () => {
    const { rerender } = render(
      <DashboardHeader view="all" count={1} creating={false} refreshing={false} onCreate={vi.fn()} onRefresh={vi.fn()} />,
    );
    expect(screen.getByLabelText('1 project').textContent).toBe('1');

    rerender(<DashboardHeader view="all" count={3} creating={false} refreshing={false} onCreate={vi.fn()} onRefresh={vi.fn()} />);
    expect(screen.getByLabelText('3 projects').textContent).toBe('3');
  });

  it('exposes initial project loading as a named busy status', () => {
    render(<DashboardLoadingGrid />);

    const status = screen.getByRole('status', { name: 'Loading projects' });
    expect(status.getAttribute('aria-busy')).toBe('true');
  });
});
