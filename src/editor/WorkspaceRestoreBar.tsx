import { useAtom } from 'jotai';
import { leftPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { LogoButton } from '@/editor/header/LeftHeader';
import ProjectChip from '@/editor/header/ProjectChip';
import { WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_RADIUS, WORKSPACE_FLOAT_SHADOW } from '@/editor/workspace-layout';
import { trace } from '@/shared/debug-trace';

export default function WorkspaceRestoreBar() {
  const [leftOpen, setLeftOpen] = useAtom(leftPaneOpenAtom);
  if (leftOpen) return null;

  return (
    <div
      data-workspace-left-restore
      className="fixed z-[9999] flex h-11 items-center overflow-hidden border border-[var(--border-light)] bg-[var(--bg-panel)]"
      style={{
        left: WORKSPACE_FLOAT_INSET,
        top: WORKSPACE_FLOAT_INSET,
        width: 264,
        borderRadius: WORKSPACE_FLOAT_RADIUS,
        boxShadow: WORKSPACE_FLOAT_SHADOW,
      }}
    >
      <div className="flex h-full w-10 shrink-0 items-center justify-center">
        <LogoButton />
      </div>
      <div aria-hidden className="h-5 w-px shrink-0 bg-[var(--border-light)]" />
      <div className="flex min-w-0 flex-1 items-center px-2">
        <ProjectChip />
      </div>
      <button
        type="button"
        aria-label="Expand left workspace"
        title="Expand left workspace"
        onClick={() => {
          trace.action('workspace:left-restore');
          setLeftOpen(true);
        }}
        className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border-none bg-transparent text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" width="15" height="15">
          <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1" />
          <path d="M5.25 2.25v11.5" />
          <path d="m8.5 6-2 2 2 2" />
        </svg>
      </button>
    </div>
  );
}
