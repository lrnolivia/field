export type EditorEntranceRole = 'left' | 'right' | 'bottom';
export type FieldDashboardLayerState = 'visible' | 'showing' | 'hiding' | 'hidden';

export interface EditorEntranceTargetSpec {
  selector: string;
  role: EditorEntranceRole;
}

export const EDITOR_ENTRANCE_DURATION_MS = 330;
export const EDITOR_ENTRANCE_SIDE_DELAY_MS = 44;
export const EDITOR_ENTRANCE_BOTTOM_DELAY_MS = 86;

/**
 * Dashboard's split-slide is currently 150ms. We intentionally wait 64ms
 * after the shell enters `hiding`, then apply the per-surface delays:
 *
 *   side chrome starts: 64 + 44 = 108ms into Dashboard's exit
 *   bottom bar starts:  64 + 86 = 150ms into Dashboard's exit
 *
 * So the website is visibly exposed first, the side chrome begins to arrive
 * near the end of the Dashboard motion, and the bottom island starts exactly
 * as the Dashboard slabs finish clearing. This is one handoff, not two
 * unrelated animations.
 */
export const EDITOR_ENTRANCE_DASHBOARD_HANDOFF_MS = 64;

export const FIELD_SHELL_SELECTOR = '.field-shell';

/**
 * Optional compatibility seam for an external/custom navigator.
 * FieldShell now provides the authoritative `data-dashboard-state`, so normal
 * Dashboard → editor navigation no longer depends on this marker.
 */
export const EDITOR_ENTRANCE_NOT_BEFORE_KEY = 'field:editor-reveal-not-before';

export const EDITOR_ENTRANCE_TARGETS: readonly EditorEntranceTargetSpec[] = Object.freeze([
  { selector: '[data-left-menu-rail]', role: 'left' },
  { selector: '[data-editor-panel="left-primary"]', role: 'left' },
  { selector: '[data-workspace-right-body]', role: 'right' },
  { selector: '#bottom-toolbar-container', role: 'bottom' },
]);

export function editorEntranceDelay(role: EditorEntranceRole): number {
  return role === 'bottom' ? EDITOR_ENTRANCE_BOTTOM_DELAY_MS : EDITOR_ENTRANCE_SIDE_DELAY_MS;
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

export function editorEntranceKeyframes(role: EditorEntranceRole): Keyframe[] {
  const start =
    role === 'left'
      ? '-110% 0'
      : role === 'right'
        ? '110% 0'
        : '0 calc(100% + 28px)';

  const overshoot =
    role === 'left'
      ? '3px 0'
      : role === 'right'
        ? '-3px 0'
        : '0 -3px';

  const correction =
    role === 'left'
      ? '-1px 0'
      : role === 'right'
        ? '1px 0'
        : '0 1px';

  const finalNudge =
    role === 'left'
      ? '0.35px 0'
      : role === 'right'
        ? '-0.35px 0'
        : '0 -0.35px';

  return [
    { offset: 0, translate: start, opacity: 0.96 },
    { offset: 0.54, translate: overshoot, opacity: 1 },
    { offset: 0.72, translate: correction, opacity: 1 },
    { offset: 0.87, translate: finalNudge, opacity: 1 },
    { offset: 1, translate: '0 0', opacity: 1 },
  ];
}

export function collectEditorEntranceTargets(
  root: ParentNode,
): Array<{ element: HTMLElement; role: EditorEntranceRole }> {
  const seen = new Set<HTMLElement>();
  const targets: Array<{ element: HTMLElement; role: EditorEntranceRole }> = [];

  for (const spec of EDITOR_ENTRANCE_TARGETS) {
    for (const node of root.querySelectorAll<HTMLElement>(spec.selector)) {
      if (seen.has(node)) continue;
      seen.add(node);
      targets.push({ element: node, role: spec.role });
    }
  }

  return targets;
}

export function consumeEditorEntranceNotBeforeDelay(
  storage: Pick<Storage, 'getItem' | 'removeItem'> | null,
  now: number = Date.now(),
): number {
  if (!storage) return 0;

  let raw: string | null = null;
  try {
    raw = storage.getItem(EDITOR_ENTRANCE_NOT_BEFORE_KEY);
    storage.removeItem(EDITOR_ENTRANCE_NOT_BEFORE_KEY);
  } catch {
    return 0;
  }

  if (!raw) return 0;
  const notBefore = Number(raw);
  if (!Number.isFinite(notBefore)) return 0;
  return Math.max(0, Math.min(900, notBefore - now));
}
