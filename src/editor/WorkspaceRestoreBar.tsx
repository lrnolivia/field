import { useAtomValue } from 'jotai';
import { leftPaneOpenAtom, leftContentWidthAtom, LEFT_RAIL_WIDTH } from '@/code/stores/workspace-panels-store';
import { LogoButton } from '@/editor/header/LeftHeader';
import ProjectChip from '@/editor/header/ProjectChip';
import { WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_RADIUS } from '@/editor/workspace-layout';
import WorkspaceModeButton from './WorkspaceModeButton';
import { leftRailVisibleAtom, workspaceModeAtom } from './workspace-mode-store';
import { workspaceTitlePresentation } from './workspace-title-presentation';

export default function WorkspaceRestoreBar() {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const mode = useAtomValue(workspaceModeAtom);
  const railVisible = useAtomValue(leftRailVisibleAtom);
  const contentWidth = useAtomValue(leftContentWidthAtom);
  const presentation = workspaceTitlePresentation(mode, leftOpen, railVisible);
  const visible = presentation !== 'embedded';
  const full = presentation === 'full-pill';

  return (
    <div data-workspace-left-restore data-visible={visible ? 'true' : 'false'} data-mode={mode}
      aria-hidden={!visible} inert={!visible}
      className="fixed z-[9999] flex h-11 items-center overflow-hidden rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[var(--shadow-lg)] transition-[width,opacity,transform] duration-300 ease-out"
      style={{
        left: visible ? (full ? WORKSPACE_FLOAT_INSET : LEFT_RAIL_WIDTH + WORKSPACE_FLOAT_INSET) : LEFT_RAIL_WIDTH,
        top: visible ? WORKSPACE_FLOAT_INSET : 0,
        width: full && visible ? LEFT_RAIL_WIDTH + contentWidth : contentWidth,
        height: visible ? 44 : 52,
        maxWidth: `calc(100vw - ${WORKSPACE_FLOAT_INSET * 2}px)`,
        borderRadius: visible ? WORKSPACE_FLOAT_RADIUS : 0,
        boxShadow: visible ? 'var(--shadow-lg)' : 'none',
      }}>
      {full && <div className="flex h-full w-[51px] shrink-0 items-center justify-center"><LogoButton /></div>}
      {full && <div aria-hidden className="h-5 w-px shrink-0 bg-[var(--border-light)]" />}
      <div className="flex min-w-0 flex-1 items-center gap-1 pl-2 pr-9">
        <div data-title-identity className="min-w-0 flex-1"><ProjectChip /></div>
        <WorkspaceModeButton />
      </div>
    </div>
  );
}
