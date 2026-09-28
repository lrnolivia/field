import { useAtomValue } from 'jotai';
import { leftPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { LogoButton } from '@/editor/header/LeftHeader';
import ProjectChip from '@/editor/header/ProjectChip';
import { WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_RADIUS } from '@/editor/workspace-layout';
import WorkspaceAutoHideButton from './WorkspaceAutoHideButton';
import WorkspaceModeButton from './WorkspaceModeButton';

export default function WorkspaceRestoreBar() {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
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
        width: 312,
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
      <WorkspaceAutoHideButton />
      <WorkspaceModeButton />
    </div>
  );
}
