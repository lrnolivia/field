import { useAtom, useAtomValue } from 'jotai';
import { floatingEntranceAtom, workspaceAutoHideAtom } from './workspace-mode-store';

export function AutoHideEyeIcon({ enabled }: { enabled: boolean }) {
  return <svg aria-hidden viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10c2.2-3.2 4.9-4.8 8-4.8s5.8 1.6 8 4.8c-2.2 3.2-4.9 4.8-8 4.8S4.2 13.2 2 10Z" />
    {enabled ? <path d="M2.5 16.5 17.5 3.5" /> : <circle cx="10" cy="10" r="2.4" />}
  </svg>;
}

export default function WorkspaceAutoHideButton({ side = 'left', className = '' }: { side?: 'left' | 'right'; className?: string }) {
  const [enabled, setEnabled] = useAtom(workspaceAutoHideAtom);
  const entrance = useAtomValue(floatingEntranceAtom);
  const label = side === 'right' ? 'Auto-hide Inspector' : 'Auto-hide panels';
  return <div className={`z-10 ${className || 'relative'}`}>
    <button type="button" data-workspace-autohide data-side={side} aria-label={label}
      aria-pressed={enabled} title={`${label}: ${enabled ? 'on' : 'off'}`}
      onClick={() => setEnabled(!enabled)}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] transition-colors hover:bg-[var(--bg-hover)] ${enabled ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'} ${entrance ? 'animate-pulse ring-1 ring-[var(--accent)]' : ''}`}>
      <AutoHideEyeIcon enabled={enabled} />
    </button>
    {entrance && <span role="tooltip" className={`pointer-events-none absolute bottom-0 z-20 w-44 rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-2 py-1.5 text-[11px] leading-4 text-[var(--text-primary)] shadow-[var(--shadow-md)] ${side === 'left' ? 'left-9' : 'right-9'}`}>
      {enabled ? 'Auto-hide on' : 'Auto-hide off'}
    </span>}
  </div>;
}


export function WorkspaceCollapseButton({
  side = 'left',
  collapsed,
  onClick,
  className = '',
}: {
  side?: 'left' | 'right';
  collapsed: boolean;
  onClick: () => void;
  className?: string;
}) {
  const label = collapsed
    ? (side === 'right' ? 'Expand Inspector' : 'Expand panel')
    : (side === 'right' ? 'Collapse Inspector' : 'Collapse panel');
  const path = side === 'right'
    ? (collapsed ? 'M2 2v12M11 4 7 8l4 4' : 'M14 2v12M5 4l4 4-4 4')
    : (collapsed ? 'M14 2v12M5 4l4 4-4 4' : 'M2 2v12M11 4 7 8l4 4');
  return (
    <button
      type="button"
      data-workspace-collapse
      data-side={side}
      aria-label={label}
      aria-pressed={collapsed}
      title={label}
      onClick={onClick}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] ${className}`}
    >
      <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </button>
  );
}
