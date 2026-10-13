/** Shared event names and pure gesture decisions. No timers gate a tap. */
export const PORTRAIT_EDIT_EVENT = 'field:portrait-edit-selection';
export const QUICK_TOOLS_EVENT = 'field:quick-tools';
export const OBJECT_TAP_SLOP = 4;

export function movedPastTapSlop(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > OBJECT_TAP_SLOP;
}

export function shouldOpenTapEditor(input: {
  kind: string; moved: boolean; dragging: boolean; cancelled?: boolean; textEditing?: boolean;
}): boolean {
  return input.kind === 'object' && !input.moved && !input.dragging
    && !input.cancelled && !input.textEditing;
}

export type PortraitDestination = 'tools' | 'comments' | 'project' | 'browse' | 'pages' | 'layers' | 'media' | 'library' | 'presets' | 'cms' | 'locale' | 'branches' | 'insert' | 'inspect';
export type InspectorTask = 'context' | 'geometry' | 'appearance' | 'content' | 'advanced' | 'prototype' | 'export';
