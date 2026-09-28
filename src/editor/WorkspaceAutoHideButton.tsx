import { useAtom } from 'jotai';
import { workspaceAutoHideAtom } from './workspace-mode-store';

export default function WorkspaceAutoHideButton() {
  const [enabled, setEnabled] = useAtom(workspaceAutoHideAtom);
  return <button type="button" data-workspace-autohide aria-label="Auto-hide workspace panels"
    aria-pressed={enabled} title={enabled ? 'Auto-hide panels on canvas click' : 'Keep panels visible'}
    onClick={() => setEnabled(!enabled)}
    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] transition-colors hover:bg-[var(--bg-hover)] ${enabled ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
    <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="2" /><path d="M5 6v4M11 6v4" />
      {enabled && <path d="m6.5 8 1.5 1.5L10 7" />}
    </svg>
  </button>;
}
