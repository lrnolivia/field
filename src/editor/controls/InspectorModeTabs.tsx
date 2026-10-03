import { useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { rightPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import WorkspaceAutoHideButton, { WorkspaceCollapseButton } from '@/editor/WorkspaceAutoHideButton';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';
import { FigmaFrameIcon } from '@/shared/loew-figma-icons';

export default function InspectorModeTabs() {
  const setRightPaneOpen = useSetAtom(rightPaneOpenAtom);
  const uiCase = useUiChromeCase();

  return (
    <div
      data-inspector-mode-tabs
      className="shrink-0 h-10 px-[var(--panel-inset)] flex items-center gap-1"
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
        <FigmaFrameIcon size={14} />
        {uiCase('Inspector')}
      </span>
      <div data-inspector-pane-actions className="ml-auto flex items-center gap-1">
        <motion.div layoutId="right-inspector-autohide" transition={{ duration: 0.2, ease: 'easeInOut' }}>
          <WorkspaceAutoHideButton side="right" />
        </motion.div>
        <motion.div layoutId="right-inspector-collapse" transition={{ duration: 0.2, ease: 'easeInOut' }}>
          <WorkspaceCollapseButton side="right" collapsed={false} onClick={() => setRightPaneOpen(false)} />
        </motion.div>
      </div>
    </div>
  );
}
