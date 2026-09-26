import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldProjectMeta } from '@/backend/field-projects';
import NewProjectWizard from './NewProjectWizard';

const createdProject: FieldProjectMeta = {
  id: 'project-created',
  name: 'Untitled',
  createdAt: '2026-09-26T00:00:00Z',
  updatedAt: '2026-09-26T00:00:00Z',
  starred: false,
  trashedAt: null,
  thumbnail: null,
};

function renderWizard(overrides: Partial<{
  onClose: () => void;
  onCreate: () => Promise<FieldProjectMeta>;
  onDone: (project: FieldProjectMeta) => void;
}> = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const onCreate = overrides.onCreate ?? vi.fn().mockResolvedValue(createdProject);
  const onDone = overrides.onDone ?? vi.fn();

  render(
    <NewProjectWizard
      open
      onClose={onClose}
      onCreate={onCreate}
      onDone={onDone}
    />,
  );

  return { onClose, onCreate, onDone };
}

describe('NewProjectWizard focus flow', () => {
  it('focuses and selects Project name when opened', async () => {
    renderWizard();

    const input = screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement;

    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('moves focus into Responsive canvases and restores Project name focus on Back', async () => {
    renderWizard();

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    const heading = await screen.findByRole('heading', { name: 'Responsive canvases' });
    await waitFor(() => {
      expect(document.activeElement).toBe(heading);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    const input = screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement;
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('dismisses on Escape while idle', () => {
    const onClose = vi.fn();
    renderWizard({ onClose });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss while creation is in flight', async () => {
    const onClose = vi.fn();
    const onCreate = vi.fn(() => new Promise<FieldProjectMeta>(() => {}));
    renderWizard({ onClose, onCreate });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByRole('button', { name: 'Creating…' });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('presentation'));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
