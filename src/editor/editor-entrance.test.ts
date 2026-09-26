import { describe, expect, it } from 'vitest';
import {
  collectEditorEntranceTargets,
  consumeEditorEntranceNotBeforeDelay,
  editorEntranceDelay,
  editorEntranceKeyframes,
  EDITOR_ENTRANCE_BOTTOM_DELAY_MS,
  EDITOR_ENTRANCE_DASHBOARD_HANDOFF_MS,
  EDITOR_ENTRANCE_DURATION_MS,
  EDITOR_ENTRANCE_NOT_BEFORE_KEY,
  EDITOR_ENTRANCE_SIDE_DELAY_MS,
  readFieldDashboardLayerState,
} from './editor-entrance';

describe('editor entrance choreography', () => {
  it('keeps Canvas out of the entrance target set', () => {
    document.body.innerHTML = `
      <div data-left-menu-rail></div>
      <div data-editor-panel="left-primary"></div>
      <div data-workspace-right-body></div>
      <div id="bottom-toolbar-container"></div>
      <div data-canvas-root></div>
    `;
    const targets = collectEditorEntranceTargets(document);
    expect(targets.map(({ role }) => role)).toEqual(['left', 'left', 'right', 'bottom']);
    expect(targets.some(({ element }) => element.hasAttribute('data-canvas-root'))).toBe(false);
  });

  it('coordinates side and bottom arrival with the 150ms Dashboard split-slide', () => {
    expect(editorEntranceDelay('left')).toBe(EDITOR_ENTRANCE_SIDE_DELAY_MS);
    expect(editorEntranceDelay('right')).toBe(EDITOR_ENTRANCE_SIDE_DELAY_MS);
    expect(editorEntranceDelay('bottom')).toBe(EDITOR_ENTRANCE_BOTTOM_DELAY_MS);
    expect(EDITOR_ENTRANCE_DASHBOARD_HANDOFF_MS + EDITOR_ENTRANCE_SIDE_DELAY_MS).toBe(108);
    expect(EDITOR_ENTRANCE_DASHBOARD_HANDOFF_MS + EDITOR_ENTRANCE_BOTTOM_DELAY_MS).toBe(150);
    expect(EDITOR_ENTRANCE_DURATION_MS).toBe(330);
  });

  it('travels from the nearest edge with only a tiny fixed-pixel overshoot', () => {
    const left = editorEntranceKeyframes('left');
    const right = editorEntranceKeyframes('right');
    const bottom = editorEntranceKeyframes('bottom');

    expect(left[0].translate).toBe('-110% 0');
    expect(right[0].translate).toBe('110% 0');
    expect(bottom[0].translate).toBe('0 calc(100% + 28px)');
    expect(left[1].translate).toBe('3px 0');
    expect(right[1].translate).toBe('-3px 0');
    expect(bottom[1].translate).toBe('0 -3px');
    expect(left[left.length - 1].translate).toBe('0 0');
    expect(right[right.length - 1].translate).toBe('0 0');
    expect(bottom[bottom.length - 1].translate).toBe('0 0');
  });

  it('reads the live FieldShell Dashboard state that gates the reveal', () => {
    document.body.innerHTML = `<div class="field-shell" data-dashboard-state="visible"></div>`;
    expect(readFieldDashboardLayerState(document)).toBe('visible');

    const shell = document.querySelector<HTMLElement>('.field-shell')!;
    shell.dataset.dashboardState = 'hiding';
    expect(readFieldDashboardLayerState(document)).toBe('hiding');

    shell.dataset.dashboardState = 'hidden';
    expect(readFieldDashboardLayerState(document)).toBe('hidden');

    shell.dataset.dashboardState = 'nonsense';
    expect(readFieldDashboardLayerState(document)).toBeNull();
  });

  it('consumes an optional not-before handoff once and clamps it', () => {
    const values = new Map<string, string>([
      [EDITOR_ENTRANCE_NOT_BEFORE_KEY, '1600'],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => { values.delete(key); },
    };

    expect(consumeEditorEntranceNotBeforeDelay(storage, 1000)).toBe(600);
    expect(values.has(EDITOR_ENTRANCE_NOT_BEFORE_KEY)).toBe(false);

    values.set(EDITOR_ENTRANCE_NOT_BEFORE_KEY, '99999');
    expect(consumeEditorEntranceNotBeforeDelay(storage, 1000)).toBe(900);
  });
});
