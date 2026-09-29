import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { leftPaneOpenAtom, leftContentWidthAtom, LEFT_RAIL_WIDTH } from '@/code/stores/workspace-panels-store';
import { LogoButton } from '@/editor/header/LeftHeader';
import ProjectChip from '@/editor/header/ProjectChip';
import { WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_RADIUS } from '@/editor/workspace-layout';
import WorkspaceModeButton, { WORKSPACE_MODE_COLLAPSED_WIDTH, WORKSPACE_MODE_EXPANDED_WIDTH } from './WorkspaceModeButton';
import { workspaceModeAtom } from './workspace-mode-store';

export default function WorkspaceRestoreBar() {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const mode = useAtomValue(workspaceModeAtom);
  const contentWidth = useAtomValue(leftContentWidthAtom);
  const [layoutExpanded, setLayoutExpanded] = useState(false);
  if (mode !== 'floating' || leftOpen) return null;

  const baseWidth = LEFT_RAIL_WIDTH + contentWidth;
  const layoutDelta = layoutExpanded ? WORKSPACE_MODE_EXPANDED_WIDTH - WORKSPACE_MODE_COLLAPSED_WIDTH : 0;

  return (
    <div data-workspace-left-restore data-visible="true" data-mode={mode}
      className="fixed z-[9999] flex h-11 items-center overflow-hidden rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[var(--shadow-lg)] transition-[width,opacity,transform] duration-300 ease-out"
      style={{ left: WORKSPACE_FLOAT_INSET, top: WORKSPACE_FLOAT_INSET, width: baseWidth + layoutDelta, maxWidth: `calc(100vw - ${WORKSPACE_FLOAT_INSET * 2}px)`, borderRadius: WORKSPACE_FLOAT_RADIUS }}>
      <div className="flex h-full w-[51px] shrink-0 items-center justify-center"><LogoButton /></div>
      <div aria-hidden className="h-5 w-px shrink-0 bg-[var(--border-light)]" />
      <div className="flex min-w-0 flex-1 items-center gap-1 px-2">
        <div className="min-w-0 flex-1"><ProjectChip /></div>
        <WorkspaceModeButton onExpandedChange={setLayoutExpanded} />
      </div>
    </div>
  );
}
