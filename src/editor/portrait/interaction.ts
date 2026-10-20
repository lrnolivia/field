/** Shared event names and pure gesture decisions. No timers gate a tap. */
export const PORTRAIT_EDIT_EVENT = 'field:portrait-edit-selection';
export const QUICK_TOOLS_EVENT = 'field:quick-tools';
export const OBJECT_TAP_SLOP = 4;

export function movedPastTapSlop(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > OBJECT_TAP_SLOP;
}

/** A finger wobbles more than a mouse: a touch press stays a TAP (select /
 *  edit) until it travels this far; only then does it become an object drag. */
export const TOUCH_TAP_SLOP = 10;
export function movedPastTouchTapSlop(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > TOUCH_TAP_SLOP;
}

/** Two taps within this window and radius are a double-tap (finger-sized —
 *  the desktop double-click radius is 5px). */
export const TOUCH_DOUBLE_TAP_MS = 450;
export const TOUCH_DOUBLE_TAP_RADIUS = 32;
export function isTouchDoubleTap(
  last: { x: number; y: number; time: number } | null,
  x: number, y: number, time: number,
): boolean {
  return !!last && time - last.time < TOUCH_DOUBLE_TAP_MS
    && Math.hypot(x - last.x, y - last.y) <= TOUCH_DOUBLE_TAP_RADIUS;
}

export function shouldOpenTapEditor(input: {
  kind: string; moved: boolean; dragging: boolean; cancelled?: boolean; textEditing?: boolean;
}): boolean {
  return input.kind === 'object' && !input.moved && !input.dragging
    && !input.cancelled && !input.textEditing;
}

export type PortraitDestination = 'tools' | 'comments' | 'project' | 'browse' | 'pages' | 'layers' | 'media' | 'library' | 'presets' | 'cms' | 'locale' | 'branches' | 'insert' | 'inspect';
export type InspectorTask = 'context' | 'geometry' | 'appearance' | 'content' | 'advanced' | 'prototype' | 'export';
