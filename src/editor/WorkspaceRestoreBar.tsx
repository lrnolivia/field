import { useAtomValue, useSetAtom } from 'jotai';
import { leftPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from '@/editor/detached-left-panel-store';
import { LogoButton } from '@/editor/header/LeftHeader';
import ProjectChip from '@/editor/header/ProjectChip';
import { WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_RADIUS } from '@/editor/workspace-layout';
import { trace } from '@/shared/debug-trace';
import { setWorkspaceModeAtom } from '@/editor/workspace-mode-store';

export default function WorkspaceRestoreBar() {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const detached = useAtomValue(detachedLeftPanelAtom);
  const setWorkspaceMode = useSetAtom(setWorkspaceModeAtom);
  return (
    <div
      data-workspace-left-restore
      data-visible={!leftOpen ? 'true' : 'false'}
      aria-hidden={leftOpen ? true : undefined}
      inert={leftOpen}
      className="fixed z-[9999] flex h-11 items-center overflow-hidden"
      style={{
        left: WORKSPACE_FLOAT_INSET,
        top: WORKSPACE_FLOAT_INSET,
        width: 264,
        borderRadius: WORKSPACE_FLOAT_RADIUS,
        opacity: leftOpen ? 0 : 1,
      }}
    >
      <div className="flex h-full w-10 shrink-0 items-center justify-center">
        <LogoButton />
      </div>
      <div aria-hidden className="h-5 w-px shrink-0 bg-[var(--border-light)]" />
      <div className="flex min-w-0 flex-1 items-center px-2">
        <ProjectChip />
      </div>
      {!detached && <button type="button" aria-label="Float workspace" title="Float workspace"
        onClick={() => setWorkspaceMode('floating')}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
        <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="3" width="9" height="9" rx="1" /><path d="M8 1.75h5.25a1 1 0 0 1 1 1V8M9.25 6.75l5-5" /></svg>
      </button>}
      {!detached && <button
        type="button"
        aria-label="Expand left workspace"
        title="Expand left workspace"
        onClick={() => {
          trace.action('workspace:left-restore');
          setWorkspaceMode('docked');
        }}
        className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border-none bg-transparent text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" width="15" height="15">
          <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1" />
          <path d="M5.25 2.25v11.5" />
          <path d="m8.5 6-2 2 2 2" />
        </svg>
      </button>}
    </div>
  );
}
