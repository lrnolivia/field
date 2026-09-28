import { useAtom, useAtomValue } from 'jotai';
import { floatingEntranceAtom, workspaceAutoHideAtom } from './workspace-mode-store';

export default function WorkspaceAutoHideButton({ side = 'left', className = '' }: { side?: 'left' | 'right'; className?: string }) {
  const [enabled, setEnabled] = useAtom(workspaceAutoHideAtom);
  const entrance = useAtomValue(floatingEntranceAtom);
  return <div className={`z-10 ${className || 'relative'}`}>
    <button type="button" data-workspace-autohide data-side={side} aria-label="Auto-hide floating panels"
      aria-pressed={enabled} title={enabled ? 'Turn off auto-hide to keep panels visible' : 'Turn on auto-hide'}
      onClick={() => setEnabled(!enabled)}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] transition-colors hover:bg-[var(--bg-hover)] ${enabled ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'} ${entrance && enabled ? 'animate-pulse ring-1 ring-[var(--accent)]' : ''}`}>
      <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="12" height="10" rx="2" /><path d="M5 6v4M11 6v4" />
        {enabled && <path d="m6.5 8 1.5 1.5L10 7" />}
      </svg>
    </button>
    {entrance && enabled && <span role="tooltip" className={`pointer-events-none absolute bottom-0 z-20 w-44 rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-2 py-1.5 text-[11px] leading-4 text-[var(--text-primary)] shadow-[var(--shadow-md)] ${side === 'left' ? 'left-9' : 'right-9'}`}>
      Auto-hide is on. Click to keep panels visible.
    </span>}
  </div>;
}
