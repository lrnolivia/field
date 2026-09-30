import { useEffect, useRef } from 'react';
import type { FieldProjectMeta } from '@/backend/field-projects';

type Props = {
  project: FieldProjectMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenProject: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onToggleStar: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
};

export default function ProjectCardMenu({
  project,
  open,
  onOpenChange,
  onOpenProject,
  onRename,
  onDuplicate,
  onToggleStar,
  onTrash,
  onRestore,
  onPermanentDelete,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeFromPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        onOpenChange(false);
        return;
      }

      const menu = menuRef.current;
      if (menu?.contains(target)) return;

      const trigger = menu
        ?.closest('.field-project-card')
        ?.querySelector<HTMLElement>('.field-project-more');
      if (trigger?.contains(target)) return;

      onOpenChange(false);
    };

    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();

      const trigger = menuRef.current
        ?.closest('.field-project-card')
        ?.querySelector<HTMLElement>('.field-project-more');

      onOpenChange(false);
      trigger?.focus();
    };

    document.addEventListener('pointerdown', closeFromPointer, true);
    window.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeFromPointer, true);
      window.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [onOpenChange, open]);

  if (!open) return null;
  const trashed = Boolean(project.trashedAt);

  const run = (fn: () => void) => {
    const trigger = menuRef.current?.closest('.field-project-card')?.querySelector<HTMLElement>('.field-project-more');
    trigger?.focus();
    onOpenChange(false);
    fn();
  };

  return (
    <div
      ref={menuRef}
      className="field-project-menu"
      role="menu"
      onKeyDown={(event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : event.key === 'ArrowDown' ? (current + 1) % items.length
            : (current <= 0 ? items.length : current) - 1;
        items[next]?.focus();
      }}
    >
      {!trashed ? (
        <>
          <button role="menuitem" type="button" onClick={() => run(onOpenProject)}>Open</button>
          <button role="menuitem" type="button" onClick={() => run(onRename)}>Rename</button>
          <button role="menuitem" type="button" onClick={() => run(onDuplicate)}>Duplicate</button>
          <button role="menuitem" type="button" onClick={() => run(onToggleStar)}>
            {project.starred ? 'Unstar' : 'Star'}
          </button>
          <span className="field-project-menu-separator" />
          <button role="menuitem" type="button" className="field-project-menu-danger" onClick={() => run(onTrash)}>
            Move to Trash
          </button>
        </>
      ) : (
        <>
          <button role="menuitem" type="button" onClick={() => run(onRestore)}>Restore</button>
          <span className="field-project-menu-separator" />
          <button role="menuitem" type="button" className="field-project-menu-danger" onClick={() => run(onPermanentDelete)}>
            Delete permanently…
          </button>
        </>
      )}
    </div>
  );
}
