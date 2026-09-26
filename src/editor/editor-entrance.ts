export type EditorEntranceRole = 'left' | 'right' | 'bottom';
export type FieldDashboardLayerState = 'visible' | 'showing' | 'hiding' | 'hidden';

export interface EditorEntranceTargetSpec {
  selector: string;
  role: EditorEntranceRole;
}

export interface EditorSpringProfile {
  stiffness: number;
  damping: number;
  mass: number;
  durationMs: number;
  samples: number;
}

export interface EditorEntranceTarget {
  element: HTMLElement;
  role: EditorEntranceRole;
}

export interface EditorChromeExitRequestDetail {
  waitUntil(promise: Promise<unknown>): void;
}

export const FIELD_SHELL_SELECTOR = '.field-shell';
export const DIRECT_LOAD_RENDER_EVENT = 'revyme:render-complete';
export const EDITOR_CHROME_EXIT_REQUEST_EVENT = 'field:editor-chrome-exit-request';

/**
 * ProjectLoader keeps a loading-shell overlay mounted for ~280ms after the
 * first Canvas render completes. The entrance must begin after that overlay
 * clears or a hard refresh animates invisibly underneath it.
 */
export const DIRECT_LOAD_SHELL_CLEAR_MS = 310;
export const DIRECT_LOAD_FAILSAFE_MS = 4400;

/**
 * Move the PHYSICAL panel surfaces and the content laid over them together.
 * The canvas itself is deliberately absent.
 */
export const EDITOR_ENTRANCE_TARGETS: readonly EditorEntranceTargetSpec[] = Object.freeze([
  { selector: '[data-workspace-island="left"]', role: 'left' },
  { selector: '[data-left-menu-rail]', role: 'left' },
  { selector: '[data-editor-panel="left-primary"]', role: 'left' },

  { selector: '[data-workspace-island="right"]', role: 'right' },
  { selector: '[data-workspace-right-body]', role: 'right' },

  { selector: '#bottom-toolbar-container', role: 'bottom' },
]);

/**
 * Structural panes should feel weighted, not bouncy. This is effectively
 * critical damping: the pane decelerates into its exact edge without crossing
 * past rest and exposing a transient gap/flash at the viewport edge.
 */
export const EDITOR_SIDE_SPRING: Readonly<EditorSpringProfile> = Object.freeze({
  stiffness: 520,
  damping: 42.3,
  mass: 0.86,
  durationMs: 340,
  samples: 30,
});

/**
 * The bottom toolbar is the one playful beat. It is intentionally
 * under-damped so the whole floating island rises past home and settles.
 */
export const EDITOR_BOTTOM_SPRING: Readonly<EditorSpringProfile> = Object.freeze({
  stiffness: 390,
  damping: 20,
  mass: 0.88,
  durationMs: 500,
  samples: 42,
});

export const EDITOR_BOTTOM_DELAY_MS = 42;

/**
 * Leaving for Dashboard is not a reversed spring. Structural chrome accelerates
 * cleanly away, making room for Dashboard's own incoming split-slide.
 */
export const EDITOR_EXIT_SIDE_DURATION_MS = 220;
export const EDITOR_EXIT_BOTTOM_DURATION_MS = 190;
export const EDITOR_EXIT_SIDE_DELAY_MS = 18;
export const EDITOR_EXIT_BOTTOM_DELAY_MS = 0;
export const EDITOR_EXIT_EASING = 'cubic-bezier(.42, 0, .78, .28)';

export function editorSpringProfile(role: EditorEntranceRole): Readonly<EditorSpringProfile> {
  return role === 'bottom' ? EDITOR_BOTTOM_SPRING : EDITOR_SIDE_SPRING;
}

export function editorEntranceDelay(role: EditorEntranceRole): number {
  return role === 'bottom' ? EDITOR_BOTTOM_DELAY_MS : 0;
}

export function editorExitDuration(role: EditorEntranceRole): number {
  return role === 'bottom' ? EDITOR_EXIT_BOTTOM_DURATION_MS : EDITOR_EXIT_SIDE_DURATION_MS;
}

export function editorExitDelay(role: EditorEntranceRole): number {
  return role === 'bottom' ? EDITOR_EXIT_BOTTOM_DELAY_MS : EDITOR_EXIT_SIDE_DELAY_MS;
}

export function readFieldDashboardLayerState(
  root: ParentNode,
): FieldDashboardLayerState | null {
  const shell = root.querySelector<HTMLElement>(FIELD_SHELL_SELECTOR);
  const state = shell?.dataset.dashboardState;
  return state === 'visible' || state === 'showing' || state === 'hiding' || state === 'hidden'
    ? state
    : null;
}

export function collectEditorEntranceTargets(root: ParentNode): EditorEntranceTarget[] {
  const seen = new Set<HTMLElement>();
  const targets: EditorEntranceTarget[] = [];

  for (const spec of EDITOR_ENTRANCE_TARGETS) {
    for (const node of root.querySelectorAll<HTMLElement>(spec.selector)) {
      if (seen.has(node)) continue;
      seen.add(node);
      targets.push({ element: node, role: spec.role });
    }
  }

  return targets;
}

export function editorEntranceDistances(
  targets: readonly EditorEntranceTarget[],
  viewportWidth: number,
  viewportHeight: number,
): Record<EditorEntranceRole, number> {
  const byRole: Record<EditorEntranceRole, DOMRect[]> = {
    left: [],
    right: [],
    bottom: [],
  };

  for (const target of targets) {
    byRole[target.role].push(target.element.getBoundingClientRect());
  }

  const leftTravel = byRole.left.length
    ? Math.max(...byRole.left.map((rect) => rect.right)) + 16
    : 320;
  const rightTravel = byRole.right.length
    ? Math.max(...byRole.right.map((rect) => viewportWidth - rect.left)) + 16
    : 280;
  const bottomTravel = byRole.bottom.length
    ? Math.max(...byRole.bottom.map((rect) => viewportHeight - rect.top)) + 20
    : 88;

  return {
    left: -Math.max(64, leftTravel),
    right: Math.max(64, rightTravel),
    bottom: Math.max(64, bottomTravel),
  };
}

/**
 * Normalized displacement of a mass/spring/damper released from x=1 at rest.
 *
 * 1 = starting edge
 * 0 = final rest
 * negative = overshoot past rest
 */
export function springDisplacement(
  elapsedSeconds: number,
  profile: Pick<EditorSpringProfile, 'stiffness' | 'damping' | 'mass'>,
): number {
  const { stiffness, damping, mass } = profile;
  const naturalFrequency = Math.sqrt(stiffness / mass);
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
  const epsilon = 1e-3;

  if (Math.abs(dampingRatio - 1) <= epsilon) {
    const wt = naturalFrequency * elapsedSeconds;
    return (1 + wt) * Math.exp(-wt);
  }

  if (dampingRatio > 1) {
    const root = Math.sqrt(dampingRatio * dampingRatio - 1);
    const r1 = -naturalFrequency * (dampingRatio - root);
    const r2 = -naturalFrequency * (dampingRatio + root);
    const a = -r2 / (r1 - r2);
    const b = r1 / (r1 - r2);
    return a * Math.exp(r1 * elapsedSeconds) + b * Math.exp(r2 * elapsedSeconds);
  }

  const dampedFrequency = naturalFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
  const coefficient = dampingRatio / Math.sqrt(1 - dampingRatio * dampingRatio);
  const envelope = Math.exp(-dampingRatio * naturalFrequency * elapsedSeconds);

  return envelope * (
    Math.cos(dampedFrequency * elapsedSeconds)
    + coefficient * Math.sin(dampedFrequency * elapsedSeconds)
  );
}

export function editorSpringKeyframes(
  role: EditorEntranceRole,
  startDistancePx: number,
): Keyframe[] {
  const profile = editorSpringProfile(role);
  const durationSeconds = profile.durationMs / 1000;
  const frames: Keyframe[] = [];

  for (let index = 0; index < profile.samples; index += 1) {
    const offset = index / (profile.samples - 1);
    const time = durationSeconds * offset;
    const unit = index === profile.samples - 1 ? 0 : springDisplacement(time, profile);
    const px = startDistancePx * unit;
    const opacity = Math.min(1, Math.max(0.96, 1 - Math.max(0, unit) * 0.04));

    frames.push({
      offset,
      translate: role === 'left' || role === 'right'
        ? `${px}px 0`
        : `0 ${px}px`,
      opacity,
    });
  }

  return frames;
}

export function editorExitKeyframes(
  role: EditorEntranceRole,
  exitDistancePx: number,
): Keyframe[] {
  return [
    {
      offset: 0,
      translate: role === 'bottom' ? '0 0px' : '0px 0',
      opacity: 1,
    },
    {
      offset: 1,
      translate: role === 'bottom'
        ? `0 ${exitDistancePx}px`
        : `${exitDistancePx}px 0`,
      opacity: 1,
    },
  ];
}

export function springOvershootRatio(profile: EditorSpringProfile): number {
  let min = 0;
  const durationSeconds = profile.durationMs / 1000;
  for (let index = 0; index < profile.samples; index += 1) {
    const t = durationSeconds * index / (profile.samples - 1);
    min = Math.min(min, springDisplacement(t, profile));
  }
  return Math.abs(min);
}

/**
 * FieldShell asks editor chrome to leave before it starts Dashboard's incoming
 * split-slide. Any mounted editor coordinator can register a promise via
 * waitUntil; no listener means immediate completion.
 */
export async function requestEditorChromeExit(doc: Document): Promise<void> {
  const waits: Promise<unknown>[] = [];
  const detail: EditorChromeExitRequestDetail = {
    waitUntil(promise) {
      waits.push(Promise.resolve(promise));
    },
  };

  doc.dispatchEvent(new CustomEvent<EditorChromeExitRequestDetail>(
    EDITOR_CHROME_EXIT_REQUEST_EVENT,
    { detail },
  ));

  if (waits.length === 0) return;
  await Promise.all(waits.map((promise) => promise.catch(() => undefined)));
}
