// ChromeIslands.tsx — structural surfaces behind editor chrome.
// Docked panes remain rectilinear. A lone visible pane becomes one restrained
// floating island above the full-bleed canvas.

import { useAtomValue } from 'jotai';
import { leftPaneOpenAtom, rightPaneOpenAtom, leftContentWidthAtom, rightPaneWidthAtom, rightPaneDetachedAtom, rightPaneDragOffsetAtom, rightFloatingHeightAtom, floatingLeftHeightAtom, leftCollapsedWidthAtom } from '@/code/stores/workspace-panels-store';
import {
  deriveWorkspaceLayout,
  WORKSPACE_FLOAT_INSET,
  WORKSPACE_FLOAT_RADIUS,
  WORKSPACE_FLOAT_SHADOW,
  type WorkspaceSideLayout,
} from './workspace-layout';
import { floatingInspectorVisibleAtom, leftRailVisibleAtom, workspaceModeAtom } from './workspace-mode-store';

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
  const mode = useAtomValue(workspaceModeAtom);
  const railVisible = useAtomValue(leftRailVisibleAtom);
  const rightOpen = useAtomValue(rightPaneOpenAtom);
  const rightDetached = useAtomValue(rightPaneDetachedAtom);
  const rightDragOffset = useAtomValue(rightPaneDragOffsetAtom);
  const rightFloatingHeight = useAtomValue(rightFloatingHeightAtom);
  const floatingLeftHeight = useAtomValue(floatingLeftHeightAtom);
  const inspectorVisible = useAtomValue(floatingInspectorVisibleAtom);
  const leftCollapsedWidth = useAtomValue(leftCollapsedWidthAtom);
  const leftContentWidth = useAtomValue(leftContentWidthAtom);
  const rightPaneWidth = useAtomValue(rightPaneWidthAtom);
  const layout = deriveWorkspaceLayout(leftOpen, rightOpen, { leftContentWidth, rightPaneWidth, rightDetached });

  return (
    <>
      <div
        aria-hidden
        data-workspace-island="left"
        data-visible={leftOpen || railVisible ? 'true' : 'false'}
        className={layout.left.presentation === 'docked' ? 'fixed z-[4998] border-r border-[var(--border-light)]' : 'fixed z-[4998]'}
        style={{
          left: leftOpen ? layout.left.inset : WORKSPACE_FLOAT_INSET,
          top: leftOpen ? layout.left.top : 60,
          width: leftOpen ? layout.left.width : leftCollapsedWidth,
          height: leftOpen ? `calc(100vh - ${layout.left.top + layout.left.bottom}px)` : Math.min(floatingLeftHeight, window.innerHeight - 68),
          ...SURFACE,
          ...(leftOpen ? floatingStyle(layout.left) : {
            border: '1px solid var(--border-light)',
            borderRadius: WORKSPACE_FLOAT_RADIUS,
            boxShadow: WORKSPACE_FLOAT_SHADOW,
          }),
          opacity: leftOpen || railVisible ? 1 : 0,
          transform: !leftOpen && !railVisible ? 'translateX(-18px)' : undefined,
          transition: 'transform 260ms ease, opacity 260ms ease',
        }}
      />

      {!leftOpen && <div aria-hidden data-workspace-left-title-surface
        className="pointer-events-none fixed left-2 top-2 z-[4999] h-11 w-[312px] rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[var(--shadow-lg)]" />}

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
            opacity: inspectorVisible ? 1 : 0,
            pointerEvents: 'none',
            translate: rightDetached && !inspectorVisible ? 'calc(100% + 24px) 0' : undefined,
            transition: 'translate 260ms ease, opacity 260ms ease',
          }}
        />
      )}
    </>
  );
}
