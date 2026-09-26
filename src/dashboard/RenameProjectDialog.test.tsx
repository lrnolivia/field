import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldProjectMeta } from '@/backend/field-projects';
import RenameProjectDialog from './RenameProjectDialog';

const project: FieldProjectMeta = {
  id: 'project-1',
  name: 'Portfolio',
  createdAt: '2026-09-26T00:00:00Z',
  updatedAt: '2026-09-26T01:00:00Z',
  starred: false,
  trashedAt: null,
  thumbnail: null,
};

describe('RenameProjectDialog', () => {
  it('focuses and selects the current project name when opened', async () => {
    render(
      <RenameProjectDialog
        project={project}
        saving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement;

    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(project.name.length);
  });

  it('dismisses on Escape while idle', () => {
    const onClose = vi.fn();
    render(
      <RenameProjectDialog
        project={project}
        saving={false}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses from the backdrop while idle', () => {
    const onClose = vi.fn();
    render(
      <RenameProjectDialog
        project={project}
        saving={false}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    fireEvent.mouseDown(screen.getByRole('presentation'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks dismissal controls while a save is in flight', () => {
    const onClose = vi.fn();
    render(
      <RenameProjectDialog
        project={project}
        saving
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('presentation'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Project name' })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('submits a trimmed project name', () => {
    const onSave = vi.fn();
    render(
      <RenameProjectDialog
        project={project}
        saving={false}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Project name' });
    fireEvent.change(input, { target: { value: '  Case study  ' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSave).toHaveBeenCalledWith('Case study');
  });

  it('does not submit an empty project name', () => {
    const onSave = vi.fn();
    render(
      <RenameProjectDialog
        project={project}
        saving={false}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Project name' });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
