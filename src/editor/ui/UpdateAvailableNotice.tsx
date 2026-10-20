// UpdateAvailableNotice.tsx — quiet "newer version" prompt for a stale tab.
//
// Never reloads on its own. Reload waits for the project to be saved and
// explains instead of reloading when changes are unsaved or offline.

import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { newerBuildAtom, reloadToLatestBuild, startBuildFreshnessWatch } from '@/backend/build-freshness';
import { loadedFieldBuild } from '@/backend/build-info';

export default function UpdateAvailableNotice() {
  const newer = useAtomValue(newerBuildAtom);
  const [dismissedSha, setDismissedSha] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => startBuildFreshnessWatch(), []);

  if (!newer || dismissedSha === newer.commitSha) return null;

  const reload = async () => {
    setBusy(true);
    setMessage(null);
    const result = await reloadToLatestBuild();
    if (!result.ok) {
      setBusy(false);
      setMessage(result.reason === 'offline'
        ? 'You’re offline with unsaved changes. Reload once they’ve saved.'
        : 'Your latest changes haven’t saved yet. Reload once they have.');
    }
  };

  return (
    <div
      data-update-available=""
      role="status"
      aria-live="polite"
      className="fixed left-1/2 bottom-[72px] z-[60] -translate-x-1/2 flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-3 py-2 text-[12px] text-[var(--text-primary)] shadow-[0_6px_20px_rgba(0,0,0,0.16)]"
    >
      <span className="min-w-0">
        {message ?? (
          <>A newer version of field is ready <span className="text-[var(--text-tertiary)]">({loadedFieldBuild.shortSha} → {newer.shortSha})</span></>
        )}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => { void reload(); }}
        className="h-7 shrink-0 rounded-[6px] bg-[var(--accent)] px-3 text-[12px] font-medium text-white disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Reload'}
      </button>
      <button
        type="button"
        onClick={() => setDismissedSha(newer.commitSha)}
        aria-label="Dismiss update notice"
        className="h-7 shrink-0 rounded-[6px] px-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
      >
        Later
      </button>
    </div>
  );
}
