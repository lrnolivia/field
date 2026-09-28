import {
  DEFAULT_LEFT_CONTENT_WIDTH,
  DEFAULT_RIGHT_PANE_WIDTH,
  LEFT_RAIL_WIDTH,
  clampLeftContentWidth,
  clampRightPaneWidth,
} from '@/code/stores/workspace-panels-store';

export type WorkspacePresentation = 'hidden' | 'docked' | 'floating';

export interface WorkspaceSideLayout {
  presentation: WorkspacePresentation;
  inset: number;
  top: number;
  bottom: number;
  width: number;
}

export interface WorkspaceCameraInsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface WorkspaceLayout {
  left: WorkspaceSideLayout;
  right: WorkspaceSideLayout;
  cameraInsets: WorkspaceCameraInsets;
}

export const WORKSPACE_FLOAT_INSET = 8;
export const WORKSPACE_HEADER_HEIGHT = 52;
export const WORKSPACE_FLOAT_RADIUS = 8;
export const WORKSPACE_FLOAT_SHADOW = '0 12px 32px rgba(0, 0, 0, 0.18)';

export interface WorkspacePaneWidths {
  leftContentWidth?: number;
  rightPaneWidth?: number;
  rightDetached?: boolean;
  leftCollapsedWidth?: number;
  rightCollapsedWidth?: number;
}
function side(open: boolean, width: number): WorkspaceSideLayout {
  if (!open) {
    return { presentation: 'hidden', inset: 0, top: 0, bottom: 0, width };
  }
  return { presentation: 'docked', inset: 0, top: 0, bottom: 0, width };
}

/**
 * Deterministic workspace presentation contract:
 * Pane presentation is explicit: closing the opposite side does not
 * silently turn a docked pane into a floating pane.
 *
 * Floating chrome does not shrink the physical canvas. `cameraInsets`
 * describes only the safe rectangle used by automatic fit/center commands.
 * Small local restore controls are intentionally not promoted to full-edge
 * insets: doing so would waste an entire canvas strip for a tiny overlay.
 */
export function deriveWorkspaceLayout(
  leftOpen: boolean,
  rightOpen: boolean,
  widths: WorkspacePaneWidths = {},
): WorkspaceLayout {
  const leftContentWidth = clampLeftContentWidth(widths.leftContentWidth ?? DEFAULT_LEFT_CONTENT_WIDTH);
  const rightPaneWidth = clampRightPaneWidth(widths.rightPaneWidth ?? DEFAULT_RIGHT_PANE_WIDTH);
  const left = side(leftOpen, LEFT_RAIL_WIDTH + leftContentWidth);
  const right = rightOpen && widths.rightDetached
    ? { presentation: 'floating' as const, inset: 24, top: 70, bottom: 24, width: rightPaneWidth }
    : side(rightOpen, rightPaneWidth);

  return {
    left,
    right,
    cameraInsets: {
      left: leftOpen ? left.width + left.inset : widths.leftCollapsedWidth ?? 0,
      top: 0,
      right: rightOpen && !widths.rightDetached ? right.width + right.inset : !rightOpen ? widths.rightCollapsedWidth ?? 0 : 0,
      // Local overlays (bottom toolbar / restore controls) do not consume an
      // entire viewport edge. Full-height side chrome is the only scalar-safe
      // geometry represented by CameraCommands today.
      bottom: 0,
    },
  };
}

export function workspaceBodyTop(sideLayout: WorkspaceSideLayout): number {
  return sideLayout.top + WORKSPACE_HEADER_HEIGHT;
}

export function workspaceBodyHeightCss(sideLayout: WorkspaceSideLayout): string {
  return `calc(100vh - ${sideLayout.top + WORKSPACE_HEADER_HEIGHT + sideLayout.bottom}px)`;
}
