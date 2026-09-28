// ChromeIslands.tsx — structural surfaces behind editor chrome.
// Docked panes remain rectilinear. A lone visible pane becomes one restrained
// floating island above the full-bleed canvas.

import { useAtomValue } from 'jotai';
import { leftPaneOpenAtom, rightPaneOpenAtom, leftContentWidthAtom, rightPaneWidthAtom, rightPaneDetachedAtom, rightPaneDragOffsetAtom, rightFloatingHeightAtom, leftCollapsedWidthAtom } from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from '@/editor/detached-left-panel-store';
import {
  deriveWorkspaceLayout,
  WORKSPACE_FLOAT_INSET,
  WORKSPACE_FLOAT_RADIUS,
  WORKSPACE_FLOAT_SHADOW,
  type WorkspaceSideLayout,
} from './workspace-layout';

const SURFACE = {
  background: 'var(--bg-panel)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  boxSizing: 'border-box' as const,
  pointerEvents: 'none' as const,
};

function floatingStyle(side: WorkspaceSideLayout) {
  return side.presentation === 'floating'
    ? {
        border: '1px solid var(--border-light)',
        borderRadius: WORKSPACE_FLOAT_RADIUS,
        boxShadow: WORKSPACE_FLOAT_SHADOW,
      }
    : { borderRadius: 0, boxShadow: 'none' };
}

export default function ChromeIslands() {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const leftDetached = useAtomValue(detachedLeftPanelAtom);
  const rightOpen = useAtomValue(rightPaneOpenAtom);
  const rightDetached = useAtomValue(rightPaneDetachedAtom);
  const rightDragOffset = useAtomValue(rightPaneDragOffsetAtom);
  const rightFloatingHeight = useAtomValue(rightFloatingHeightAtom);
  const leftCollapsedWidth = useAtomValue(leftCollapsedWidthAtom);
  const leftContentWidth = useAtomValue(leftContentWidthAtom);
  const rightPaneWidth = useAtomValue(rightPaneWidthAtom);
  const layout = deriveWorkspaceLayout(leftOpen, rightOpen, { leftContentWidth, rightPaneWidth, rightDetached });

  return (
    <>
      <div
        aria-hidden
        data-workspace-island="left"
        data-visible={leftOpen || !leftDetached ? 'true' : 'false'}
        className={layout.left.presentation === 'docked' ? 'fixed z-[4998] border-r border-[var(--border-light)]' : 'fixed z-[4998]'}
        style={{
          left: leftOpen ? layout.left.inset : WORKSPACE_FLOAT_INSET,
          top: leftOpen ? layout.left.top : WORKSPACE_FLOAT_INSET,
          width: leftOpen ? layout.left.width : leftDetached ? 0 : leftCollapsedWidth,
          height: leftOpen ? `calc(100vh - ${layout.left.top + layout.left.bottom}px)` : 'calc(100vh - 16px)',
          ...SURFACE,
          ...(leftOpen ? floatingStyle(layout.left) : {
            border: '1px solid var(--border-light)',
            borderRadius: WORKSPACE_FLOAT_RADIUS,
            boxShadow: WORKSPACE_FLOAT_SHADOW,
          }),
        }}
      />

      {!leftOpen && !leftDetached && <div aria-hidden data-workspace-left-title-surface
        className="pointer-events-none fixed left-2 top-2 z-[4999] h-11 w-[264px] rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[var(--shadow-lg)]" />}

      {rightOpen && (
        <div
          aria-hidden
          data-workspace-island="right"
          className={layout.right.presentation === 'docked' ? 'fixed z-[4998] border-l border-[var(--border-light)]' : 'fixed z-[4998]'}
          style={{
            right: layout.right.inset,
            top: layout.right.top,
            width: layout.right.width,
            height: rightDetached ? Math.min(rightFloatingHeight, window.innerHeight - layout.right.top - rightDragOffset.y - 8) : `calc(100vh - ${layout.right.top + layout.right.bottom}px)`,
            transform: rightDetached ? `translate(${rightDragOffset.x}px, ${rightDragOffset.y}px)` : undefined,
            ...SURFACE,
            ...floatingStyle(layout.right),
          }}
        />
      )}
    </>
  );
}
