// VibeDockShell.tsx — Vibe content in the same left workspace slot as other panels.

import { type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { leftPaneOpenAtom, rightPaneOpenAtom, LEFT_RAIL_WIDTH, leftContentWidthAtom } from '@/code/stores/workspace-panels-store';
import { deriveWorkspaceLayout, workspaceBodyHeightCss, workspaceBodyTop } from '@/editor/workspace-layout';
import { trace } from '@/shared/debug-trace';
import { leftRailVisibleAtom } from '@/editor/workspace-mode-store';
import SectionLabel from '@/design-system/SectionLabel';

interface Props {
  headerAccessory?: ReactNode;
  contextLabel?: string;
  onDetach: () => void;
  children: ReactNode;
}

function DetachIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 16 16">
      <path d="M0 0h16v16H0z" fill="none" />
      <path fill="currentColor" d="M9 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h-1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h6z" />
      <rect width="6" height="5" x="10" fill="currentColor" rx=".5" />
    </svg>
  );
}

export default function VibeDockShell({ headerAccessory, contextLabel, onDetach, children }: Props) {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const railVisible = useAtomValue(leftRailVisibleAtom);
  const rightOpen = useAtomValue(rightPaneOpenAtom);
  const leftContentWidth = useAtomValue(leftContentWidthAtom);
  const workspace = deriveWorkspaceLayout(leftOpen, rightOpen, { leftContentWidth });
  trace.fn('VibeDockShell.render', { contextLabel, presentation: workspace.left.presentation });

  if (!leftOpen || !railVisible) return null;

  const surfaceLabel = contextLabel
    ? contextLabel.replace(/^\//, '') || 'Home'
    : undefined;

  return (
    <div
      data-editor-panel="left-primary"
      data-vibe-dock
      className="fixed z-[5000] flex flex-col overflow-hidden"
      style={{
        left: workspace.left.inset + LEFT_RAIL_WIDTH,
        top: workspaceBodyTop(workspace.left),
        width: workspace.left.width - LEFT_RAIL_WIDTH,
        height: workspaceBodyHeightCss(workspace.left),
      }}
    >
      <SectionLabel size="xl" right={<div className="flex items-center gap-1.5 min-w-0">
          {surfaceLabel && (
            <span className="text-[11px] text-[var(--text-secondary)] truncate" title={surfaceLabel}>
              – {surfaceLabel}
            </span>
          )}
          {headerAccessory && <span className="shrink-0">{headerAccessory}</span>}
        <button
          onClick={() => { trace.action('vibe-dock:detach'); onDetach(); }}
          title="Detach into a floating window"
          className="w-6 h-6 flex items-center justify-center bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
          style={{ border: 'none' }}
        >
          <DetachIcon />
        </button>
      </div>}>Vibe</SectionLabel>

      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}
