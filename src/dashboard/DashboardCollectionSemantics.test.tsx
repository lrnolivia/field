import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldProjectMeta } from '@/backend/field-projects';
import DashboardHeader from './DashboardHeader';
import DashboardLoadingGrid from './DashboardLoadingGrid';
import ProjectGrid from './ProjectGrid';
import Dashboard from '@/Dashboard';

const api = vi.hoisted(() => ({ list: vi.fn(), rename: vi.fn(), remove: vi.fn(), create: vi.fn(), save: vi.fn(), open: vi.fn() }));
vi.mock('@/backend', () => ({ backend: { getUser: vi.fn().mockResolvedValue(null), saveProject: api.save } }));
vi.mock('@/backend/field-projects', () => ({
  listFieldProjects: api.list, renameFieldProject: api.rename, permanentlyDeleteFieldProject: api.remove,
  createFieldProject: api.create, duplicateFieldProject: vi.fn(), restoreFieldProject: vi.fn(),
  setFieldProjectStarred: vi.fn(), trashFieldProject: vi.fn(),
}));
vi.mock('@/backend/field-navigation', () => ({ openFieldProject: api.open }));
vi.mock('./DashboardThumbnailBackfill', () => ({ default: () => null }));

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
  beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue([project]);
    api.open.mockResolvedValue(undefined);
    api.save.mockResolvedValue(undefined);
  });

  it('creates and saves the default project before opening it, with duplicate clicks disabled', async () => {
    let finish!: (value: FieldProjectMeta) => void;
    api.create.mockReturnValueOnce(new Promise<FieldProjectMeta>((resolve) => { finish = resolve; }));
    render(<Dashboard />);
    await screen.findByRole('button', { name: 'Open Portfolio' });
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    const creating = screen.getByRole('button', { name: 'Creating…' });
    expect((creating as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(creating);
    expect(api.create).toHaveBeenCalledTimes(1);
    finish({ ...project, id: 'created-fixture', name: 'Untitled' });
    await waitFor(() => expect(api.open).toHaveBeenCalledWith('created-fixture'));
    expect(api.save).toHaveBeenCalledWith('created-fixture', expect.any(Object));
    expect(api.save.mock.invocationCallOrder[0]).toBeLessThan(api.open.mock.invocationCallOrder[0]);
  });

  it('keeps creation failure retryable without opening an unsaved project', async () => {
    api.create.mockRejectedValueOnce(new Error('Create unavailable'))
      .mockResolvedValueOnce({ ...project, id: 'retry-fixture', name: 'Untitled' });
    render(<Dashboard />);
    await screen.findByRole('button', { name: 'Open Portfolio' });
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Create unavailable');
    expect(api.open).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    await waitFor(() => expect(api.open).toHaveBeenCalledWith('retry-fixture'));
  });

  it('clears a failed open and lets the same card be retried', async () => {
    api.open.mockRejectedValueOnce(new Error('Open unavailable')).mockResolvedValueOnce(undefined);
    render(<Dashboard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Portfolio' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Open unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Open Portfolio' }));
    await waitFor(() => expect(api.open).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the last list after refresh refusal and replaces it on a successful retry', async () => {
    api.list.mockResolvedValueOnce([project]).mockRejectedValueOnce(new Error('Refresh unavailable')).mockResolvedValueOnce([]);
    render(<Dashboard />);
    await screen.findByRole('button', { name: 'Open Portfolio' });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh projects and thumbnails' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Refresh unavailable');
    expect(screen.getByRole('button', { name: 'Open Portfolio' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh projects and thumbnails' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Open Portfolio' })).toBeNull());
    expect((screen.getByRole('button', { name: 'Refresh projects and thumbnails' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not delete a fixture when its confirmation is cancelled', async () => {
    api.list.mockResolvedValue([{ ...project, trashedAt: '2026-09-30T00:00:00Z' }]);
    render(<Dashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Trash' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Project actions for Portfolio' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete permanently…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Project actions for Portfolio' })).toBeTruthy();
  });

  it('keeps a failed rename open with the entered name until retry succeeds', async () => {
    api.list.mockResolvedValue([project]);
    api.rename.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ ...project, name: 'New portfolio' });
    render(<Dashboard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Project actions for Portfolio' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: 'Project name' });
    fireEvent.change(input, { target: { value: 'New portfolio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Connection lost');
    expect((input as HTMLInputElement).value).toBe('New portfolio');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Open New portfolio' })).toBeTruthy();
  });

  it('keeps failed deletion retryable and removes the card only after success', async () => {
    api.list.mockResolvedValue([{ ...project, trashedAt: '2026-09-30T00:00:00Z' }]);
    api.remove.mockRejectedValueOnce(new Error('Delete unavailable')).mockResolvedValueOnce(undefined);
    render(<Dashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Trash' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Project actions for Portfolio' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete permanently…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Delete unavailable');
    expect(screen.getByRole('button', { name: 'Project actions for Portfolio' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Project actions for Portfolio' })).toBeNull();
  });

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
