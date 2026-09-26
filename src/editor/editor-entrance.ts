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

export const FIELD_SHELL_SELECTOR = '.field-shell';
export const DIRECT_LOAD_RENDER_EVENT = 'revyme:render-complete';

/**
 * ProjectLoader keeps a loading-shell overlay mounted for ~280ms after the
 * first Canvas render completes. The entrance must begin after that overlay
 * clears or a hard refresh animates invisibly underneath it.
 */
export const DIRECT_LOAD_SHELL_CLEAR_MS = 310;
export const DIRECT_LOAD_FAILSAFE_MS = 4400;

export const EDITOR_ENTRANCE_TARGETS: readonly EditorEntranceTargetSpec[] = Object.freeze([
  { selector: '[data-workspace-island="left"]', role: 'left' },
  { selector: '[data-left-menu-rail]', role: 'left' },
  { selector: '[data-editor-panel="left-primary"]', role: 'left' },

  { selector: '[data-workspace-island="right"]', role: 'right' },
  { selector: '[data-workspace-right-body]', role: 'right' },

  { selector: '#bottom-toolbar-container', role: 'bottom' },
]);

export const EDITOR_SIDE_SPRING: Readonly<EditorSpringProfile> = Object.freeze({
  stiffness: 470,
  damping: 32,
  mass: 0.82,
  durationMs: 360,
  samples: 30,
});

export const EDITOR_BOTTOM_SPRING: Readonly<EditorSpringProfile> = Object.freeze({
  stiffness: 390,
  damping: 20,
  mass: 0.88,
  durationMs: 500,
  samples: 42,
});

export const EDITOR_BOTTOM_DELAY_MS = 42;

export function editorSpringProfile(role: EditorEntranceRole): Readonly<EditorSpringProfile> {
  return role === 'bottom' ? EDITOR_BOTTOM_SPRING : EDITOR_SIDE_SPRING;
}

export function editorEntranceDelay(role: EditorEntranceRole): number {
  return role === 'bottom' ? EDITOR_BOTTOM_DELAY_MS : 0;
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

export function springDisplacement(
  elapsedSeconds: number,
  profile: Pick<EditorSpringProfile, 'stiffness' | 'damping' | 'mass'>,
): number {
  const { stiffness, damping, mass } = profile;
  const naturalFrequency = Math.sqrt(stiffness / mass);
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));

  if (dampingRatio >= 1) {
    return Math.exp(-naturalFrequency * elapsedSeconds);
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

export function springOvershootRatio(profile: EditorSpringProfile): number {
  let min = 0;
  const durationSeconds = profile.durationMs / 1000;
  for (let index = 0; index < profile.samples; index += 1) {
    const t = durationSeconds * index / (profile.samples - 1);
    min = Math.min(min, springDisplacement(t, profile));
  }
  return Math.abs(min);
}
