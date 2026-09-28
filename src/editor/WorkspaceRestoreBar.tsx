import { useAtomValue } from 'jotai';
import { leftPaneOpenAtom, leftContentWidthAtom, LEFT_RAIL_WIDTH } from '@/code/stores/workspace-panels-store';
import { LogoButton } from '@/editor/header/LeftHeader';
import ProjectChip from '@/editor/header/ProjectChip';
import { WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_RADIUS } from '@/editor/workspace-layout';
import WorkspaceModeButton from './WorkspaceModeButton';
import { workspaceModeAtom } from './workspace-mode-store';

export default function WorkspaceRestoreBar() {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const mode = useAtomValue(workspaceModeAtom);
  const contentWidth = useAtomValue(leftContentWidthAtom);
  const compactDocked = mode === 'compact-docked';
  const left = compactDocked ? 60 + WORKSPACE_FLOAT_INSET : WORKSPACE_FLOAT_INSET;
  return (
    <div
      data-workspace-left-restore
      data-visible={!leftOpen ? 'true' : 'false'}
      data-mode={mode}
      aria-hidden={leftOpen ? true : undefined}
      inert={leftOpen}
      className="fixed z-[9999] flex h-11 items-center overflow-hidden rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[var(--shadow-lg)] transition-[left,width,min-width,max-width,opacity,transform] duration-300 ease-out"
      style={{
        left,
        top: WORKSPACE_FLOAT_INSET,
        width: 'max-content',
        minWidth: compactDocked ? contentWidth + 52 : LEFT_RAIL_WIDTH + contentWidth,
        maxWidth: `calc(100vw - ${left + WORKSPACE_FLOAT_INSET}px)`,
        borderRadius: WORKSPACE_FLOAT_RADIUS,
        opacity: leftOpen ? 0 : 1,
      }}
    >
      <div
        data-workspace-restore-logo
        data-hidden={compactDocked ? 'true' : 'false'}
        className="flex h-full shrink-0 items-center justify-center overflow-hidden"
        style={{
          width: compactDocked ? 0 : 40,
          opacity: compactDocked ? 0 : 1,
          transform: compactDocked ? 'rotate(-72deg) scale(.35)' : 'rotate(0deg) scale(1)',
          transition: 'width 300ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease, transform 300ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <LogoButton />
      </div>
      <div
        aria-hidden
        data-workspace-restore-divider
        className="h-5 shrink-0 bg-[var(--border-light)]"
        style={{ width: compactDocked ? 0 : 1, opacity: compactDocked ? 0 : 1, transition: 'width 240ms ease, opacity 160ms ease' }}
      />
      <div
        data-workspace-restore-title
        className="flex min-w-0 shrink-0 items-center"
        style={{ width: contentWidth, paddingLeft: compactDocked ? 10 : 8, paddingRight: 8, transition: 'padding 300ms ease' }}
      >
        <ProjectChip compactIdentity={compactDocked} />
      </div>
      <div className="shrink-0 pr-1.5">
        <WorkspaceModeButton />
      </div>
    </div>
  );
}
