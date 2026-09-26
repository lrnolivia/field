import { describe, expect, it, vi } from 'vitest';
import {
  collectEditorEntranceTargets,
  DIRECT_LOAD_FAILSAFE_MS,
  DIRECT_LOAD_RENDER_EVENT,
  DIRECT_LOAD_SHELL_CLEAR_MS,
  EDITOR_BOTTOM_DELAY_MS,
  EDITOR_BOTTOM_SPRING,
  EDITOR_CHROME_EXIT_REQUEST_EVENT,
  EDITOR_EXIT_BOTTOM_DURATION_MS,
  EDITOR_EXIT_SIDE_DURATION_MS,
  EDITOR_SIDE_SPRING,
  editorEntranceDelay,
  editorEntranceDistances,
  editorExitDelay,
  editorExitKeyframes,
  editorSpringKeyframes,
  readFieldDashboardLayerState,
  requestEditorChromeExit,
  springDisplacement,
  springOvershootRatio,
} from './editor-entrance';

describe('editor chrome choreography', () => {
  it('targets physical panel shells together with their content and excludes Canvas', () => {
    document.body.innerHTML = `
      <div data-workspace-island="left"></div>
      <div data-left-menu-rail></div>
      <div data-editor-panel="left-primary"></div>
      <div data-workspace-island="right"></div>
      <div data-workspace-right-body></div>
      <div id="bottom-toolbar-container"></div>
      <div data-canvas-root></div>
    `;

    const targets = collectEditorEntranceTargets(document);
    expect(targets.map(({ role }) => role)).toEqual([
      'left', 'left', 'left', 'right', 'right', 'bottom',
    ]);
    expect(targets.some(({ element }) => element.dataset.workspaceIsland === 'left')).toBe(true);
    expect(targets.some(({ element }) => element.dataset.workspaceIsland === 'right')).toBe(true);
    expect(targets.some(({ element }) => element.hasAttribute('data-canvas-root'))).toBe(false);
  });

  it('uses one shared travel distance for every surface in the same pane', () => {
    document.body.innerHTML = `
      <div data-workspace-island="left"></div>
      <div data-left-menu-rail></div>
      <div data-editor-panel="left-primary"></div>
      <div data-workspace-island="right"></div>
      <div data-workspace-right-body></div>
      <div id="bottom-toolbar-container"></div>
    `;

    const elements = Array.from(document.body.children) as HTMLElement[];
    Object.defineProperty(elements[0], 'getBoundingClientRect', { value: () => ({ right: 312, left: 0, top: 48 } as DOMRect) });
    Object.defineProperty(elements[1], 'getBoundingClientRect', { value: () => ({ right: 52, left: 0, top: 48 } as DOMRect) });
    Object.defineProperty(elements[2], 'getBoundingClientRect', { value: () => ({ right: 312, left: 52, top: 48 } as DOMRect) });
    Object.defineProperty(elements[3], 'getBoundingClientRect', { value: () => ({ right: 1440, left: 1180, top: 48 } as DOMRect) });
    Object.defineProperty(elements[4], 'getBoundingClientRect', { value: () => ({ right: 1440, left: 1180, top: 48 } as DOMRect) });
    Object.defineProperty(elements[5], 'getBoundingClientRect', { value: () => ({ right: 900, left: 540, top: 830 } as DOMRect) });

    const distances = editorEntranceDistances(collectEditorEntranceTargets(document), 1440, 900);
    expect(distances.left).toBe(-328);
    expect(distances.right).toBe(276);
    expect(distances.bottom).toBe(90);
  });

  it('uses a critically damped structural entrance with no side overshoot', () => {
    expect(EDITOR_SIDE_SPRING).toMatchObject({
      stiffness: 520,
      damping: 42.3,
      mass: 0.86,
    });
    expect(springOvershootRatio(EDITOR_SIDE_SPRING)).toBe(0);

    const frames = editorSpringKeyframes('left', -320);
    const translations = frames.map((frame) => Number(String(frame.translate).split('px')[0]));
    expect(translations.every((value) => value <= 0)).toBe(true);
    expect(frames[frames.length - 1].translate).toBe('0px 0');
  });

  it('keeps the bottom toolbar as the playful under-damped beat', () => {
    expect(EDITOR_BOTTOM_SPRING).toMatchObject({
      stiffness: 390,
      damping: 20,
      mass: 0.88,
    });
    expect(editorEntranceDelay('bottom')).toBe(EDITOR_BOTTOM_DELAY_MS);
    expect(EDITOR_BOTTOM_DELAY_MS).toBe(42);

    const bottomOvershoot = springOvershootRatio(EDITOR_BOTTOM_SPRING);
    expect(bottomOvershoot).toBeGreaterThan(0.1);

    const frames = editorSpringKeyframes('bottom', 90);
    const translations = frames.map((frame) => {
      const match = String(frame.translate).match(/0 (-?[0-9.]+)px/);
      return match ? Number(match[1]) : 0;
    });
    expect(Math.min(...translations)).toBeLessThan(-8);
    expect(frames[frames.length - 1].translate).toBe('0 0px');
  });

  it('exits structural chrome cleanly with no reverse bounce', () => {
    const left = editorExitKeyframes('left', -328);
    const right = editorExitKeyframes('right', 276);
    const bottom = editorExitKeyframes('bottom', 90);

    expect(left).toEqual([
      { offset: 0, translate: '0px 0', opacity: 1 },
      { offset: 1, translate: '-328px 0', opacity: 1 },
    ]);
    expect(right[1].translate).toBe('276px 0');
    expect(bottom[1].translate).toBe('0 90px');
    expect(EDITOR_EXIT_SIDE_DURATION_MS).toBe(220);
    expect(EDITOR_EXIT_BOTTOM_DURATION_MS).toBe(190);
    expect(editorExitDelay('bottom')).toBe(0);
    expect(editorExitDelay('left')).toBeGreaterThan(0);
  });

  it('lets FieldShell await every mounted editor exit participant', async () => {
    const first = vi.fn();
    const second = vi.fn();

    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ waitUntil(promise: Promise<unknown>): void }>).detail;
      detail.waitUntil(Promise.resolve().then(first));
      detail.waitUntil(Promise.resolve().then(second));
    };

    document.addEventListener(EDITOR_CHROME_EXIT_REQUEST_EVENT, onRequest, { once: true });
    await requestEditorChromeExit(document);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps the direct-load boundary after ProjectLoader shell clears', () => {
    expect(DIRECT_LOAD_RENDER_EVENT).toBe('revyme:render-complete');
    expect(DIRECT_LOAD_SHELL_CLEAR_MS).toBeGreaterThan(280);
    expect(DIRECT_LOAD_SHELL_CLEAR_MS).toBeLessThan(400);
    expect(DIRECT_LOAD_FAILSAFE_MS).toBeGreaterThan(4000);
  });

  it('reads FieldShell hidden as the authoritative Dashboard completion state', () => {
    document.body.innerHTML = `<div class="field-shell" data-dashboard-state="hiding"></div>`;
    expect(readFieldDashboardLayerState(document)).toBe('hiding');

    const shell = document.querySelector<HTMLElement>('.field-shell')!;
    shell.dataset.dashboardState = 'hidden';
    expect(readFieldDashboardLayerState(document)).toBe('hidden');
  });

  it('bottom spring crosses rest while the structural spring stays monotonic', () => {
    expect(springDisplacement(0, EDITOR_BOTTOM_SPRING)).toBeCloseTo(1, 6);
    expect(springDisplacement(0.18, EDITOR_BOTTOM_SPRING)).toBeLessThan(0);
    expect(springDisplacement(0.18, EDITOR_SIDE_SPRING)).toBeGreaterThanOrEqual(0);
  });
});
