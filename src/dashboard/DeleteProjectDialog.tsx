import { useEffect, useRef } from 'react';
import type { FieldProjectMeta } from '@/backend/field-projects';

type Props = {
  project: FieldProjectMeta | null;
  deleting: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteProjectDialog({
  project,
  deleting,
  error,
  onClose,
  onConfirm,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project?.id) return;
    const previousFocus = document.activeElement;
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const frame = requestAnimationFrame(() => {
      if (deleting) dialogRef.current?.focus();
      else cancelRef.current?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (deleting) {
          event.preventDefault();
          dialogRef.current?.focus();
        } else if (event.shiftKey && document.activeElement !== last) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement !== first) {
          event.preventDefault();
          first?.focus();
        }
      } else if (event.key === 'Escape' && !deleting) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
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
        ref={dialogRef}
        tabIndex={-1}
        className="field-dashboard-modal field-dashboard-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-delete-project-title"
        aria-describedby="field-delete-project-detail"
        aria-busy={deleting || undefined}
      >
        <div className="field-dashboard-modal-copy">
          <h2 id="field-delete-project-title">Delete project permanently?</h2>
          <p id="field-delete-project-detail">
            “{name}” will be permanently deleted. This can’t be undone.
          </p>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="field-dashboard-modal-actions">
          <button ref={cancelRef} type="button" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            ref={confirmRef}
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
