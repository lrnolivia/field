import { useEffect, useRef, useState } from 'react';
import type { FieldProjectMeta } from '@/backend/field-projects';

type Props = {
  project: FieldProjectMeta | null;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

export default function RenameProjectDialog({ project, saving, onClose, onSave }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(project?.name ?? '');
    if (project) requestAnimationFrame(() => inputRef.current?.select());
  }, [project]);

  if (!project) return null;

  return (
    <div className="field-dashboard-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <form className="field-dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="field-rename-title" onSubmit={(event) => {
        event.preventDefault();
        const name = value.trim();
        if (name) onSave(name);
      }}>
        <h2 id="field-rename-title">Rename project</h2>
        <input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} maxLength={200} />
        <div className="field-dashboard-modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="field-dashboard-modal-primary" disabled={saving || !value.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
