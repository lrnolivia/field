import {
  EDITOR_EXIT_EASING,
  EDITOR_EXIT_SIDE_DURATION_MS,
  EDITOR_SIDE_SPRING,
  springDisplacement,
  type EditorSpringProfile,
} from '@/editor/editor-entrance';

export type DashboardPanelRole = 'sidebar' | 'main';
export type DashboardMotionDirection = 'show' | 'hide';

export interface DashboardPanelTarget {
  element: HTMLElement;
  role: DashboardPanelRole;
}

/**
 * Dashboard structural motion deliberately answers the editor structural
 * motion instead of defining a second language. Major slabs inherit the
 * editor's critically-damped spring, decisive exit duration, and exit curve.
 */
export const DASHBOARD_STRUCTURAL_SPRING: Readonly<EditorSpringProfile> = EDITOR_SIDE_SPRING;
export const DASHBOARD_EXIT_DURATION_MS = EDITOR_EXIT_SIDE_DURATION_MS;
export const DASHBOARD_EXIT_EASING = EDITOR_EXIT_EASING;

export const DASHBOARD_PANEL_GAP_PX = 16;
export const DASHBOARD_PANEL_STAGGER_MS = 18;
export const DASHBOARD_EDITOR_HANDOFF_FRAMES = 2;

/**
 * Dashboard -> Canvas: compact navigation slab leads out, main follows.
 * Canvas -> Dashboard: main reclaims the workspace first, sidebar follows.
 * 18ms matches the editor's structural exit offset; 42ms remains reserved for
 * the playful floating toolbar beat on the editor side.
 */
export function dashboardPanelDelay(
  role: DashboardPanelRole,
  direction: DashboardMotionDirection,
): number {
  if (direction === 'hide') return role === 'main' ? DASHBOARD_PANEL_STAGGER_MS : 0;
  return role === 'sidebar' ? DASHBOARD_PANEL_STAGGER_MS : 0;
}

export function collectDashboardPanelTargets(root: ParentNode): DashboardPanelTarget[] {
  const sidebar = root.querySelector<HTMLElement>('.field-dashboard-sidebar');
  const main = root.querySelector<HTMLElement>('.field-dashboard-main');
  return [
    ...(sidebar ? [{ element: sidebar, role: 'sidebar' as const }] : []),
    ...(main ? [{ element: main, role: 'main' as const }] : []),
  ];
}

export function dashboardPanelOffscreenX(role: DashboardPanelRole, width: number): number {
  const distance = Math.max(64, Math.max(0, width) + DASHBOARD_PANEL_GAP_PX);
  return role === 'sidebar' ? -distance : distance;
}

/**
 * Sample the same critical/over-damped structural spring used by editor panes.
 * The final keyframe is forced to exact rest so large slabs never expose a
 * transient gutter or white seam at the viewport edge.
 */
export function dashboardEntranceKeyframes(
  fromX: number,
  profile: Readonly<EditorSpringProfile> = DASHBOARD_STRUCTURAL_SPRING,
): Keyframe[] {
  const durationSeconds = profile.durationMs / 1000;
  const frames: Keyframe[] = [];

  for (let index = 0; index < profile.samples; index += 1) {
    const offset = index / (profile.samples - 1);
    const time = durationSeconds * offset;
    const unit = index === profile.samples - 1 ? 0 : springDisplacement(time, profile);
    frames.push({
      offset,
      transform: `translate3d(${fromX * unit}px, 0, 0)`,
    });
  }

  return frames;
}

/** Major Dashboard slabs leave decisively; playfulness belongs to small UI. */
export function dashboardExitKeyframes(fromX: number, toX: number): Keyframe[] {
  return [
    { offset: 0, transform: `translate3d(${fromX}px, 0, 0)` },
    { offset: 1, transform: `translate3d(${toX}px, 0, 0)` },
  ];
}

/** Browser getComputedStyle normally returns matrix()/matrix3d(). */
export function readTransformTranslateX(transform: string): number {
  if (!transform || transform === 'none') return 0;

  const matrix3d = /^matrix3d\((.+)\)$/.exec(transform);
  if (matrix3d) {
    const values = matrix3d[1].split(',').map((value) => Number.parseFloat(value.trim()));
    return Number.isFinite(values[12]) ? values[12] : 0;
  }

  const matrix = /^matrix\((.+)\)$/.exec(transform);
  if (matrix) {
    const values = matrix[1].split(',').map((value) => Number.parseFloat(value.trim()));
    return Number.isFinite(values[4]) ? values[4] : 0;
  }

  const translate3d = /^translate3d\((-?[0-9.]+)px,/.exec(transform);
  if (translate3d) return Number.parseFloat(translate3d[1]);

  const translateX = /^translateX\((-?[0-9.]+)px\)/.exec(transform);
  if (translateX) return Number.parseFloat(translateX[1]);

  return 0;
}

/**
 * Let outgoing editor chrome establish direction for two paints, then start
 * Dashboard's incoming slabs while the editor is still moving. Two paints are
 * ~33ms at 60Hz and ~17ms at 120Hz: enough to read as a handoff, not a gap.
 */
export function waitForAnimationFrames(
  count: number,
  requestFrame: (callback: FrameRequestCallback) => number = requestAnimationFrame,
): Promise<void> {
  const frames = Math.max(0, Math.floor(count));
  if (frames === 0) return Promise.resolve();

  return new Promise((resolve) => {
    const step = (remaining: number) => {
      requestFrame(() => {
        if (remaining <= 1) resolve();
        else step(remaining - 1);
      });
    };
    step(frames);
  });
}
