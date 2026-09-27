import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldProjectMeta } from '@/backend/field-projects';
import DeleteProjectDialog from './DeleteProjectDialog';

const project: FieldProjectMeta = {
  id: 'project-1',
  name: 'Portfolio',
  createdAt: '2026-09-26T00:00:00Z',
  updatedAt: '2026-09-26T01:00:00Z',
  starred: false,
  trashedAt: '2026-09-26T02:00:00Z',
  thumbnail: null,
};

describe('DeleteProjectDialog', () => {
  it('keeps the safe Cancel action focused by default', async () => {
    render(
      <DeleteProjectDialog
        project={project}
        deleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    });
  });

  it('dismisses on Escape and backdrop press when idle', () => {
    const onClose = vi.fn();
    render(
      <DeleteProjectDialog
        project={project}
        deleting={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('presentation'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not dismiss while deletion is in flight', () => {
    const onClose = vi.fn();
    render(
      <DeleteProjectDialog
        project={project}
        deleting
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('presentation'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('runs permanent deletion only from the explicit destructive action', () => {
    const onConfirm = vi.fn();
    render(
      <DeleteProjectDialog
        project={project}
        deleting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
