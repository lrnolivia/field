import { useAtom, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { inspectorModeAtom } from '@/code/stores/editor-store';
import { rightPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import WorkspaceAutoHideButton, { WorkspaceCollapseButton } from '@/editor/WorkspaceAutoHideButton';

export default function InspectorModeTabs() {
  const [mode, setMode] = useAtom(inspectorModeAtom);
  const setRightPaneOpen = useSetAtom(rightPaneOpenAtom);

  return (
    <div
      data-inspector-mode-tabs
      className="shrink-0 h-10 px-[var(--panel-inset)] border-b border-[var(--border-light)] flex items-center gap-1"
      role="tablist"
      aria-label="Inspector mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'design'}
        onClick={() => setMode('design')}
        className={mode === 'design'
          ? 'h-7 px-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-active)] rounded-[5px]'
          : 'h-7 px-2 text-xs font-medium text-[var(--text-secondary)] rounded-[5px] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
      >
        Design
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'prototype'}
        onClick={() => setMode('prototype')}
        className={mode === 'prototype'
          ? 'h-7 px-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-active)] rounded-[5px]'
          : 'h-7 px-2 text-xs font-medium text-[var(--text-secondary)] rounded-[5px] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
      >
        Prototype
      </button>
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
