import { useAtom, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { inspectorModeAtom } from '@/code/stores/editor-store';
import { rightPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import WorkspaceAutoHideButton, { WorkspaceCollapseButton } from '@/editor/WorkspaceAutoHideButton';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';
import ChromeTabBar from '@/editor/ui/ChromeTabBar';

export default function InspectorModeTabs() {
  const [mode, setMode] = useAtom(inspectorModeAtom);
  const setRightPaneOpen = useSetAtom(rightPaneOpenAtom);
  const uiCase = useUiChromeCase();

  return (
    <div
      data-inspector-mode-tabs
      className="shrink-0 h-10 px-[var(--panel-inset)] border-b border-[var(--border-light)] flex items-center gap-1"
    >
      <ChromeTabBar
        value={mode}
        onChange={setMode}
        ariaLabel={uiCase('Inspector mode') ?? 'Inspector mode'}
        compact
        items={[
          { value: 'design', label: uiCase('Design') ?? 'Design', glyph: 'design' },
          { value: 'prototype', label: uiCase('Prototype') ?? 'Prototype', glyph: 'prototype' },
        ]}
      />
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
