// ChromeIslands.tsx — structural surfaces behind editor chrome.
// Docked panes remain rectilinear. A lone visible pane becomes one restrained
// floating island above the full-bleed canvas.

import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { leftPaneOpenAtom, rightPaneOpenAtom, leftContentWidthAtom, rightPaneWidthAtom, rightPaneDetachedAtom, rightPaneDragOffsetAtom, rightFloatingHeightAtom, floatingLeftHeightAtom, leftCollapsedWidthAtom } from '@/code/stores/workspace-panels-store';
import {
  deriveWorkspaceLayout,
  WORKSPACE_FLOAT_INSET,
  WORKSPACE_FLOAT_LEFT_TOP,
  WORKSPACE_FLOAT_RADIUS,
  WORKSPACE_FLOAT_SHADOW,
  type WorkspaceSideLayout,
} from './workspace-layout';
import { compactPanelOpenAtom, floatingInspectorVisibleAtom, floatingPanelCollapsedAtom, leftRailVisibleAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { fieldMotion, fieldMotionBlurFilter, fieldSpatialTransition, useFieldOpticalMotion, useFieldReducedMotion } from './motion';

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
  const rightPaneWidth = useAtomValue(rightPaneWidthAtom);
  const layout = deriveWorkspaceLayout(leftOpen, rightOpen, { leftContentWidth, rightPaneWidth, rightDetached });
  const dockedLeft = mode === 'docked' || mode === 'compact-docked';
  const reducedMotion = useFieldReducedMotion();
  const structuralTransition = fieldSpatialTransition(reducedMotion, fieldMotion.structural);
  const leftOpticalSignal = [mode, leftOpen ? '1' : '0', railVisible ? '1' : '0', compactPanelOpen ? '1' : '0', floatingPanelCollapsed ? '1' : '0', autoHide ? '1' : '0'].join(':');
  const leftOpticalActive = useFieldOpticalMotion(leftOpticalSignal, reducedMotion);
  const rightOpticalSignal = [mode, rightDetached ? '1' : '0', rightOpen ? '1' : '0', inspectorVisible ? '1' : '0'].join(':');
  const rightOpticalActive = useFieldOpticalMotion(rightOpticalSignal, reducedMotion);

  return (
    <>
      <motion.div
        layout={reducedMotion ? false : true}
        initial={false}
        animate={{ opacity: railVisible || leftOpen ? 1 : 0, x: !dockedLeft && !railVisible ? -18 : 0 }}
        transition={structuralTransition}
        aria-hidden
        data-workspace-island="left"
        data-visible={railVisible ? 'true' : 'false'}
        className={dockedLeft ? 'fixed z-[4998] border-r border-[var(--border-light)]' : 'fixed z-[4998]'}
        style={{
          left: dockedLeft ? 0 : WORKSPACE_FLOAT_INSET,
          top: dockedLeft ? 0 : WORKSPACE_FLOAT_LEFT_TOP,
          width: dockedLeft
            ? 52 + (leftOpen ? leftContentWidth : 0)
            : leftCollapsedWidth + ((mode === 'floating' && (!autoHide || railVisible) && !floatingPanelCollapsed) || (mode === 'compact' && compactPanelOpen) ? leftContentWidth : 0),
          height: dockedLeft ? '100vh' : Math.min(floatingLeftHeight, window.innerHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET),
          ...SURFACE,
          ...(dockedLeft ? { borderRadius: 0, boxShadow: 'none' } : {
            border: '1px solid var(--border-light)',
            borderRadius: WORKSPACE_FLOAT_RADIUS,
            boxShadow: WORKSPACE_FLOAT_SHADOW,
          }),
          transformOrigin: 'left center',
          filter: leftOpticalActive ? fieldMotionBlurFilter('horizontal') : 'none',
        }}
      />

      {rightOpen && (
        <motion.div
          layout={reducedMotion || rightDetached ? false : true}
          initial={false}
          animate={{ opacity: inspectorVisible ? 1 : 0, x: rightDetached && !inspectorVisible ? 24 : 0 }}
          transition={structuralTransition}
          aria-hidden
          data-workspace-island="right"
          className={layout.right.presentation === 'docked' ? 'fixed z-[4998] border-l border-[var(--border-light)]' : 'fixed z-[4998]'}
          style={{
            right: layout.right.inset,
            top: layout.right.top,
            width: layout.right.width,
            height: rightDetached ? Math.min(rightFloatingHeight, window.innerHeight - layout.right.top - rightDragOffset.y - 8) : `calc(100vh - ${layout.right.top + layout.right.bottom}px)`,
            translate: rightDetached ? `${rightDragOffset.x}px ${rightDragOffset.y}px` : undefined,
            ...SURFACE,
            ...floatingStyle(layout.right),
            pointerEvents: 'none',
            filter: rightOpticalActive ? fieldMotionBlurFilter('horizontal') : 'none',
          }}
        />
      )}
    </>
  );
}
