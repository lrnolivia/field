export type EditorEntranceRole = 'left' | 'right' | 'bottom';

export interface EditorEntranceTargetSpec {
  selector: string;
  role: EditorEntranceRole;
}

export const EDITOR_ENTRANCE_DURATION_MS = 330;
export const EDITOR_ENTRANCE_SIDE_DELAY_MS = 44;
export const EDITOR_ENTRANCE_BOTTOM_DELAY_MS = 86;

/**
 * Optional cross-navigation seam for Dashboard's outgoing reveal.
 * Dashboard may store an absolute Date.now() timestamp here before navigating.
 * The editor consumes it once and does not begin chrome motion before it.
 *
 * This is deliberately optional: direct /builder loads still animate without
 * Dashboard being involved, and a Dashboard implementation that uses the
 * native View Transition API is detected independently at runtime.
 */
export const EDITOR_ENTRANCE_NOT_BEFORE_KEY = 'field:editor-reveal-not-before';

export const EDITOR_ENTRANCE_TARGETS: readonly EditorEntranceTargetSpec[] = Object.freeze([
  // The left side is two fixed siblings: icon rail + active panel body.
  { selector: '[data-left-menu-rail]', role: 'left' },
  { selector: '[data-editor-panel="left-primary"]', role: 'left' },

  // Right inspector shell. The small pane-toggle button intentionally does not
  // participate; it is a persistent utility control, not the panel surface.
  { selector: '[data-workspace-right-body]', role: 'right' },

  // Animate the toolbar island itself, not its fixed centering wrapper. This
  // preserves the wrapper's translateX(-50%) positioning contract.
  { selector: '#bottom-toolbar-container', role: 'bottom' },
]);

export function editorEntranceDelay(role: EditorEntranceRole): number {
  return role === 'bottom' ? EDITOR_ENTRANCE_BOTTOM_DELAY_MS : EDITOR_ENTRANCE_SIDE_DELAY_MS;
}

/**
 * Hand-shaped spring keyframes: fast travel, a deliberately tiny overshoot,
 * then two very small corrections. The overshoot is fixed in pixels rather
 * than proportional to panel width so a 52px rail and a 260px inspector both
 * settle with the same restrained physical character.
 */
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

  // A stale/bogus handoff must never strand the editor behind invisible chrome.
  return Math.max(0, Math.min(900, notBefore - now));
}
