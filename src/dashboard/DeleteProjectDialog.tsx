import { useEffect, useRef } from 'react';
import type { FieldProjectMeta } from '@/backend/field-projects';

type Props = {
  project: FieldProjectMeta | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteProjectDialog({
  project,
  deleting,
  onClose,
  onConfirm,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!project || deleting) return;
    const frame = requestAnimationFrame(() => cancelRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [deleting, onClose, project]);

  if (!project) return null;
  const name = project.name || 'Untitled';

  return (
    <div
      className="field-dashboard-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (!deleting && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="field-dashboard-modal field-dashboard-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-delete-project-title"
        aria-describedby="field-delete-project-detail"
      >
        <div className="field-dashboard-modal-copy">
          <h2 id="field-delete-project-title">Delete project permanently?</h2>
          <p id="field-delete-project-detail">
            “{name}” will be permanently deleted. This can’t be undone.
          </p>
        </div>
        <div className="field-dashboard-modal-actions">
          <button ref={cancelRef} type="button" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            className="field-dashboard-modal-danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
