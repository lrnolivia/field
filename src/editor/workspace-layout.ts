import { LEFT_WORKSPACE_WIDTH, RIGHT_PANE_WIDTH } from '@/code/stores/workspace-panels-store';

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
function side(
  open: boolean,
  oppositeOpen: boolean,
  width: number,
): WorkspaceSideLayout {
  if (!open) {
    return { presentation: 'hidden', inset: 0, top: 0, bottom: 0, width };
  }
  if (oppositeOpen) {
    return { presentation: 'docked', inset: 0, top: 0, bottom: 0, width };
  }
  return {
    presentation: 'floating',
    inset: WORKSPACE_FLOAT_INSET,
    top: WORKSPACE_FLOAT_INSET,
    bottom: WORKSPACE_FLOAT_INSET,
    width,
  };
}

/**
 * Deterministic workspace presentation contract:
 * - two panes => docked workspace
 * - one pane  => floating workspace
 * - zero panes => canvas workspace
 *
 * Floating chrome does not shrink the physical canvas. `cameraInsets`
 * describes only the safe rectangle used by automatic fit/center commands.
 * Small local restore controls are intentionally not promoted to full-edge
 * insets: doing so would waste an entire canvas strip for a tiny overlay.
 */
export function deriveWorkspaceLayout(leftOpen: boolean, rightOpen: boolean): WorkspaceLayout {
  const left = side(leftOpen, rightOpen, LEFT_WORKSPACE_WIDTH);
  const right = side(rightOpen, leftOpen, RIGHT_PANE_WIDTH);

  return {
    left,
    right,
    cameraInsets: {
      left: leftOpen ? left.width + left.inset : 0,
      top: 0,
      right: rightOpen ? right.width + right.inset : 0,
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
