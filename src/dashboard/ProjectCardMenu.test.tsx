import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldProjectMeta } from '@/backend/field-projects';
import ProjectCardMenu from './ProjectCardMenu';

const project: FieldProjectMeta = {
  id: 'project-1',
  name: 'Portfolio',
  createdAt: '2026-09-26T00:00:00Z',
  updatedAt: '2026-09-26T01:00:00Z',
  starred: false,
  trashedAt: null,
  thumbnail: null,
};

function renderOpenMenu() {
  const onOpenChange = vi.fn();

  render(
    <article className="field-project-card">
      <button className="field-project-more" type="button">More</button>
      <ProjectCardMenu
        project={project}
        open
        onOpenChange={onOpenChange}
        onOpenProject={vi.fn()}
        onRename={vi.fn()}
        onDuplicate={vi.fn()}
        onToggleStar={vi.fn()}
        onTrash={vi.fn()}
        onRestore={vi.fn()}
        onPermanentDelete={vi.fn()}
      />
    </article>,
  );

  return {
    onOpenChange,
    trigger: screen.getByRole('button', { name: 'More' }),
    menu: screen.getByRole('menu'),
  };
}

describe('ProjectCardMenu dismissal', () => {
  it('dismisses when the user presses outside the project menu', () => {
    const { onOpenChange } = renderOpenMenu();

    fireEvent.pointerDown(document.body);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not dismiss from pointer presses inside the menu or on its trigger', () => {
    const { menu, onOpenChange, trigger } = renderOpenMenu();

    fireEvent.pointerDown(menu);
    fireEvent.pointerDown(trigger);

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('dismisses on Escape and returns focus to the project menu trigger', () => {
    const { onOpenChange, trigger } = renderOpenMenu();
    screen.getByRole('menuitem', { name: 'Open' }).focus();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('ignores unrelated keyboard input', () => {
    const { onOpenChange } = renderOpenMenu();

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
