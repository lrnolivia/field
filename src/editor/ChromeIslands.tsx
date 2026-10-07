// ChromeIslands.tsx — structural surfaces behind editor chrome.
// Docked panes remain rectilinear. A lone visible pane becomes one restrained
// floating island above the full-bleed canvas.

import { useAtomValue } from 'jotai';
import type { ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { useMobileWorkspacePresentation } from './mobile-workspace-presentation';
import { leftPaneOpenAtom, rightPaneOpenAtom, leftContentWidthAtom, rightPaneWidthAtom, rightPaneDetachedAtom, rightPaneDragOffsetAtom, rightFloatingHeightAtom, floatingLeftHeightAtom, leftCollapsedWidthAtom } from '@/code/stores/workspace-panels-store';
import {
  deriveWorkspaceLayout,
  resolveRightFloatingHeight,
  resolveLeftFloatingHeight,
  WORKSPACE_FLOAT_INSET,
  WORKSPACE_FLOAT_LEFT_TOP,
  WORKSPACE_FLOAT_RADIUS,
  type WorkspaceSideLayout,
} from './workspace-layout';
import { compactPanelOpenAtom, floatingInspectorVisibleAtom, floatingLeftDetailWidthAtom, floatingPanelCollapsedAtom, leftRailVisibleAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { useWorkspaceViewport } from './useWorkspaceViewport';

const SURFACE = {
  background: 'var(--field-chrome-pane-bg)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  boxSizing: 'border-box' as const,
  pointerEvents: 'none' as const,
};

/** The fill sits behind the chrome; its edge must sit above opaque headers. */
function ChromeIsland({ style, ...props }: ComponentProps<'div'>) {
  const floating = style?.borderRadius !== 0;
  return <>
    <div {...props} style={style} />
    {floating && createPortal(<div aria-hidden data-field-floating-outline style={{
      ...style, background: 'transparent', boxShadow: 'none', position: 'fixed',
      zIndex: 10000, pointerEvents: 'none',
    }} />, document.body)}
  </>;
}

function floatingStyle(side: WorkspaceSideLayout) {
  return side.presentation === 'floating'
    ? {
        borderRadius: WORKSPACE_FLOAT_RADIUS,
        boxShadow: 'var(--field-chrome-pane-shadow)',
      }
    : { borderRadius: 0, boxShadow: 'var(--field-chrome-docked-pane-shadow)' };
}

export default function ChromeIslands() {
  const portrait = useMobileWorkspacePresentation() === 'portrait-sheet';
  const viewport = useWorkspaceViewport();
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const mode = useAtomValue(workspaceModeAtom);
  const railVisible = useAtomValue(leftRailVisibleAtom);
  const compactPanelOpen = useAtomValue(compactPanelOpenAtom);
  const floatingPanelCollapsed = useAtomValue(floatingPanelCollapsedAtom);
  const autoHide = useAtomValue(workspaceAutoHideAtom);
  const rightOpen = useAtomValue(rightPaneOpenAtom);
  const rightDetached = useAtomValue(rightPaneDetachedAtom);
  const rightDragOffset = useAtomValue(rightPaneDragOffsetAtom);
  const rightFloatingHeight = useAtomValue(rightFloatingHeightAtom);
  const floatingLeftHeight = useAtomValue(floatingLeftHeightAtom);
  const inspectorVisible = useAtomValue(floatingInspectorVisibleAtom);
  const leftCollapsedWidth = useAtomValue(leftCollapsedWidthAtom);
  const leftContentWidth = useAtomValue(leftContentWidthAtom);
  const detailWidth = useAtomValue(floatingLeftDetailWidthAtom);
  const rightPaneWidth = useAtomValue(rightPaneWidthAtom);
  const layout = deriveWorkspaceLayout(leftOpen, rightOpen, { leftContentWidth, rightPaneWidth, rightDetached });
  const resolvedRightHeight = resolveRightFloatingHeight(viewport.height, rightFloatingHeight, rightDragOffset.y);
  const dockedLeft = mode === 'docked' || mode === 'compact-docked';

  return (
    <>
      <ChromeIsland
        aria-hidden
        data-workspace-island="left"
        data-visible={railVisible ? 'true' : 'false'}
        className="fixed z-[4998]"
        style={{
          left: dockedLeft ? 0 : WORKSPACE_FLOAT_INSET,
          top: dockedLeft ? 0 : WORKSPACE_FLOAT_LEFT_TOP,
          width: dockedLeft
            ? 52 + (leftOpen ? leftContentWidth : 0)
            : leftCollapsedWidth + (!portrait && ((mode === 'floating' && (!autoHide || railVisible) && !floatingPanelCollapsed) || (mode === 'compact' && compactPanelOpen)) ? leftContentWidth + detailWidth : 0),
          height: dockedLeft ? '100vh' : resolveLeftFloatingHeight(viewport.height, floatingLeftHeight),
          ...SURFACE,
          ...(dockedLeft ? { borderRadius: 0, boxShadow: 'var(--field-chrome-docked-pane-shadow)' } : {
            borderRadius: WORKSPACE_FLOAT_RADIUS,
            boxShadow: 'var(--field-chrome-pane-shadow)',
          }),
          opacity: railVisible || leftOpen ? 1 : 0,
          transform: !dockedLeft && !railVisible ? 'translateX(-18px)' : undefined,
          transition: 'width 260ms ease, transform 260ms ease, opacity 260ms ease',
        }}
      />

      {rightOpen && !portrait && (
        <ChromeIsland
          aria-hidden
          data-workspace-island="right"
          className="fixed z-[4998]"
          style={{
            right: layout.right.inset,
            top: layout.right.top,
            width: layout.right.width,
            height: rightDetached ? resolvedRightHeight : `calc(100vh - ${layout.right.top + layout.right.bottom}px)`,
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
