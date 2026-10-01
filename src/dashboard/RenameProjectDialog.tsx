import { useEffect, useRef, useState } from 'react';
import type { FieldProjectMeta } from '@/backend/field-projects';

type Props = {
  project: FieldProjectMeta | null;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (name: string) => void;
};

export default function RenameProjectDialog({ project, saving, error, onClose, onSave }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!project?.id) return;
    const previousFocus = document.activeElement;
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [project?.id]);

  useEffect(() => {
    setValue(project?.name ?? '');
    if (!project) return;

    const frame = requestAnimationFrame(() => {
      if (inputRef.current?.disabled) {
        dialogRef.current?.focus();
        return;
      }
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [project]);

  useEffect(() => {
    if (!project) return;
    if (saving) dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)') ?? [])];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) {
          event.preventDefault();
          dialogRef.current?.focus();
        } else if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.key !== 'Escape' || saving) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, project, saving]);

  if (!project) return null;

  return (
    <div
      className="field-dashboard-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (!saving && event.target === event.currentTarget) onClose();
      }}
    >
      <form
        ref={dialogRef}
        tabIndex={-1}
        className="field-dashboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-rename-title"
        aria-busy={saving || undefined}
        onSubmit={(event) => {
          event.preventDefault();
          const name = value.trim();
          if (name && !saving) onSave(name);
        }}
      >
        <h2 id="field-rename-title">Rename project</h2>
        <input
          ref={inputRef}
          value={value}
          disabled={saving}
          aria-label="Project name"
          onChange={(event) => setValue(event.target.value)}
          maxLength={200}
        />
        {error && <p role="alert">{error}</p>}
        <div className="field-dashboard-modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="field-dashboard-modal-primary" disabled={saving || !value.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
