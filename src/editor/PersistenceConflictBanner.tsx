import { useState } from 'react';
import { useAtomValue } from 'jotai';
import ConfirmDialog from '@/design-system/ConfirmDialog';
import { persistenceConflictAtom } from '@/backend/persistence-conflict';

export function openLatestProjectCopy(): void {
  window.open(window.location.href, '_blank', 'noopener,noreferrer');
}

export function reloadLatestProject(): void {
  window.location.reload();
}

interface PersistenceConflictBannerProps {
  onOpenLatest?: () => void;
  onReloadLatest?: () => void;
}

export default function PersistenceConflictBanner({
  onOpenLatest = openLatestProjectCopy,
  onReloadLatest = reloadLatestProject,
}: PersistenceConflictBannerProps) {
  const conflict = useAtomValue(persistenceConflictAtom);
  const [reloadConfirmOpen, setReloadConfirmOpen] = useState(false);

  if (!conflict) return null;

  return (
    <>
      <div
        data-persistence-conflict
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="fixed flex flex-wrap items-center gap-2 rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-3 py-2 text-[11px] text-[var(--text-primary)] shadow-md"
        style={{
          zIndex: 100005,
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(560px, calc(100vw - 32px))',
        }}
      >
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border-light)]"
          style={{ color: 'var(--accent-warning, #d49a3a)' }}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2.25 14 13H2L8 2.25Z" />
            <path d="M8 5.75v3.5" />
            <path d="M8 11.25h.01" />
          </svg>
        </span>

        <div className="min-w-[220px] flex-1">
          <div className="font-medium leading-4">Project changed elsewhere</div>
          <div className="text-[10px] leading-4 text-[var(--text-secondary)]">{conflict.message}</div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenLatest}
            className="h-7 rounded-[4px] border border-transparent bg-[var(--accent)] px-2.5 text-[10px] font-medium text-[var(--accent-fg)] hover:brightness-110"
          >
            Open latest
          </button>
          <button
            type="button"
            onClick={() => setReloadConfirmOpen(true)}
            className="h-7 rounded-[4px] border border-[var(--border-light)] bg-[var(--btn-secondary-bg)] px-2.5 text-[10px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            Reload latest
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={reloadConfirmOpen}
        onClose={() => setReloadConfirmOpen(false)}
        onConfirm={onReloadLatest}
        title="Reload latest version?"
        message={"This tab contains edits that could not be saved because the project changed elsewhere. Reloading will discard those local edits and open the latest saved version."}
        confirmLabel="Reload latest"
        cancelLabel="Cancel"
        danger
      />
    </>
  );
}
