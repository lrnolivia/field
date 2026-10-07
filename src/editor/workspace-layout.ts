import {
  DEFAULT_LEFT_CONTENT_WIDTH,
  DEFAULT_RIGHT_PANE_WIDTH,
  LEFT_RAIL_WIDTH,
  clampLeftContentWidth,
  clampRightPaneWidth,
  LEGACY_RIGHT_FLOATING_DEFAULT_HEIGHT,
  RIGHT_FLOATING_AUTO_HEIGHT,
} from '@/code/stores/workspace-panels-store';
import type { WorkspaceMode } from '@/code/stores/workspace-panels-store';

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

export const WORKSPACE_FLOAT_INSET = 12;
/** The bottom toolbar itself is fixed 18px above the viewport edge. */
export const WORKSPACE_BOTTOM_TOOLBAR_BOTTOM = 18;
/** Clear gap below the stationary document pill for detached left chrome. */
export const WORKSPACE_FLOAT_LEFT_TOP = 68;
export const WORKSPACE_HEADER_HEIGHT = 52;
export const WORKSPACE_FLOAT_RADIUS = 8;
export const WORKSPACE_FLOAT_SHADOW = '0 12px 32px rgba(0, 0, 0, 0.18)';
export const WORKSPACE_FLOAT_MIN_INSPECTOR_HEIGHT = 320;

/** Rail, content and backdrop share this clamp without rewriting a saved size. */
export function resolveLeftFloatingHeight(viewportHeight: number, storedHeight: number): number {
  return Math.max(0, Math.min(storedHeight, viewportHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET));
}

export interface WorkspaceFloatingOffset {
  x: number;
  y: number;
}

export function usesAutomaticRightFloatingHeight(storedHeight: number): boolean {
  return storedHeight === RIGHT_FLOATING_AUTO_HEIGHT
    || storedHeight === LEGACY_RIGHT_FLOATING_DEFAULT_HEIGHT;
}

/**
 * Default floating Inspector geometry: start at the 12px workspace inset and
 * land on the same bottom edge as the floating toolbar (18px from viewport).
 * Explicitly resized heights remain user-owned, but can never cross the 12px
 * viewport margin.
 */
export function resolveRightFloatingHeight(
  viewportHeight: number,
  storedHeight: number,
  offsetY = 0,
): number {
  const available = Math.max(0, viewportHeight - WORKSPACE_FLOAT_INSET * 2 - Math.max(0, offsetY));
  const preferred = usesAutomaticRightFloatingHeight(storedHeight)
    ? viewportHeight - WORKSPACE_FLOAT_INSET - WORKSPACE_BOTTOM_TOOLBAR_BOTTOM
    : storedHeight;
  return Math.min(available, Math.max(Math.min(WORKSPACE_FLOAT_MIN_INSPECTOR_HEIGHT, available), preferred));
}

export function clampRightFloatingHeight(
  viewportHeight: number,
  desiredHeight: number,
  offsetY = 0,
): number {
  const available = Math.max(0, viewportHeight - WORKSPACE_FLOAT_INSET * 2 - Math.max(0, offsetY));
  return Math.min(available, Math.max(Math.min(WORKSPACE_FLOAT_MIN_INSPECTOR_HEIGHT, available), desiredHeight));
}

/**
 * Floating-pane edge padding is a hard margin, not decorative whitespace.
 * The Inspector may move within the 12px safe rectangle but never beyond it.
 */
export function clampRightFloatingOffset(
  viewportWidth: number,
  viewportHeight: number,
  paneWidth: number,
  paneHeight: number,
  offset: WorkspaceFloatingOffset,
): WorkspaceFloatingOffset {
  const baseLeft = viewportWidth - WORKSPACE_FLOAT_INSET - paneWidth;
  const minX = Math.min(0, WORKSPACE_FLOAT_INSET - baseLeft);
  const maxY = Math.max(0, viewportHeight - WORKSPACE_FLOAT_INSET * 2 - paneHeight);
  return {
    x: Math.max(minX, Math.min(0, offset.x)),
    y: Math.max(0, Math.min(maxY, offset.y)),
  };
}

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
    ? { presentation: 'floating' as const, inset: 12, top: 12, bottom: 12, width: rightPaneWidth }
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

/** Automatic fit/center uses the chrome actually visible in docked layouts. */
export function deriveWorkspaceCameraInsets(
  mode: WorkspaceMode,
  leftExpanded: boolean,
  rightExpanded: boolean,
  leftVisible: boolean,
  rightVisible: boolean,
  widths: WorkspacePaneWidths = {},
): WorkspaceCameraInsets {
  if (mode !== 'docked' && mode !== 'compact-docked')
    return { left: 0, top: 0, right: 0, bottom: 0 };
  return deriveWorkspaceLayout(leftExpanded && leftVisible, rightExpanded && rightVisible, {
    ...widths,
    leftCollapsedWidth: leftVisible && !leftExpanded ? LEFT_RAIL_WIDTH : 0,
    rightCollapsedWidth: rightVisible && !rightExpanded ? widths.rightCollapsedWidth ?? 60 : 0,
  }).cameraInsets;
}

export function workspaceBodyTop(sideLayout: WorkspaceSideLayout): number {
  return sideLayout.top + WORKSPACE_HEADER_HEIGHT;
}

export function workspaceBodyHeightCss(sideLayout: WorkspaceSideLayout): string {
  return `calc(100vh - ${sideLayout.top + WORKSPACE_HEADER_HEIGHT + sideLayout.bottom}px)`;
}
