import { describe, expect, it, vi } from 'vitest';
import {
  collectEditorEntranceTargets,
  DIRECT_LOAD_FAILSAFE_MS,
  DIRECT_LOAD_RENDER_EVENT,
  DIRECT_LOAD_CHROME_STAGGER_MS,
  EDITOR_BOTTOM_DELAY_MS,
  EDITOR_BOTTOM_SPRING,
  EDITOR_CHROME_EXIT_REQUEST_EVENT,
  EDITOR_DASHBOARD_BOTTOM_DELAY_MS,
  EDITOR_DASHBOARD_BOTTOM_STAGGER_MS,
  EDITOR_DASHBOARD_LEFT_RAIL_DELAY_MS,
  EDITOR_DASHBOARD_LEFT_SURFACE_DELAY_MS,
  EDITOR_DASHBOARD_RIGHT_CONTENT_DELAY_MS,
  EDITOR_DASHBOARD_RIGHT_CONTENT_STAGGER_MS,
  EDITOR_DASHBOARD_RIGHT_SURFACE_DELAY_MS,
  EDITOR_DASHBOARD_RIGHT_SURFACE_SPRING,
  EDITOR_EXIT_BOTTOM_DURATION_MS,
  EDITOR_EXIT_SIDE_DURATION_MS,
  EDITOR_LEFT_RAIL_STAGGER_MS,
  EDITOR_SIDE_SPRING,
  editorEntranceDelay,
  editorEntranceDistances,
  editorExitDelay,
  editorExitKeyframes,
  editorSpringKeyframes,
  editorSpringProfile,
  readFieldDashboardLayerState,
  requestEditorChromeExit,
  springDisplacement,
  springOvershootRatio,
} from './editor-entrance';

describe('editor chrome choreography', () => {
  it('targets physical panel shells together with their content and excludes Canvas', () => {
    document.body.innerHTML = `
      <div data-workspace-island="left" data-visible="true"></div>
      <div data-left-menu-rail data-visible="true"></div>
      <div data-editor-panel="left-primary" data-visible="true"></div>
      <div data-workspace-island="right"></div>
      <div data-workspace-right-body></div>
      <div id="bottom-toolbar-container"></div>
      <div data-canvas-root></div>
    `;

    const targets = collectEditorEntranceTargets(document);
    expect(targets.map(({ role, phase }) => ({ role, phase }))).toEqual([
      { role: 'left', phase: 'left-surface' },
      { role: 'left', phase: 'left-rail' },
      { role: 'left', phase: 'left-surface' },
      { role: 'right', phase: 'right-surface' },
      { role: 'right', phase: 'right-content' },
      { role: 'bottom', phase: 'default' },
    ]);
    expect(targets.some(({ element }) => element.dataset.workspaceIsland === 'left')).toBe(true);
    expect(targets.some(({ element }) => element.dataset.workspaceIsland === 'right')).toBe(true);
    expect(targets.some(({ element }) => element.hasAttribute('data-canvas-root'))).toBe(false);
  });

  it('enters only the chrome visible in a saved collapsed workspace', () => {
    document.body.innerHTML = `
      <div data-workspace-island="left" data-visible="false"></div>
      <div data-workspace-left-restore data-visible="true"></div>
      <div data-left-menu-rail data-visible="false"></div>
      <div data-editor-panel="left-primary" data-visible="false"></div>
      <div data-workspace-left-header data-visible="false"></div>
      <div data-workspace-right-toggle data-visible="true"></div>
      <div id="bottom-toolbar-container"></div>
    `;

    const targets = collectEditorEntranceTargets(document);
    expect(targets.map(({ element }) =>
      element.dataset.workspaceIsland ??
      (element.hasAttribute('data-workspace-left-restore') ? 'left-restore' : undefined) ??
      (element.hasAttribute('data-workspace-right-toggle') ? 'right-toggle' : undefined) ??
      element.id,
    )).toEqual(['left', 'left-restore', 'right-toggle', 'bottom-toolbar-container']);
  });

  it('uses one shared travel distance for every surface in the same pane', () => {
    document.body.innerHTML = `
      <div data-workspace-island="left" data-visible="true"></div>
      <div data-left-menu-rail data-visible="true"></div>
      <div data-editor-panel="left-primary" data-visible="true"></div>
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
    expect(editorEntranceDelay('left', 'left-surface')).toBe(0);
    expect(editorEntranceDelay('left', 'left-rail')).toBe(EDITOR_LEFT_RAIL_STAGGER_MS);
    expect(EDITOR_LEFT_RAIL_STAGGER_MS).toBe(72);
    expect(editorEntranceDelay('right', 'right-surface')).toBe(0);
    expect(editorEntranceDelay('right', 'right-content')).toBe(0);

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

  it('uses a distinct Dashboard -> editor choreography with surface continuity', () => {
    expect(EDITOR_DASHBOARD_LEFT_SURFACE_DELAY_MS).toBe(EDITOR_EXIT_SIDE_DURATION_MS);
    expect(EDITOR_DASHBOARD_LEFT_SURFACE_DELAY_MS).toBe(220);
    expect(EDITOR_DASHBOARD_LEFT_RAIL_DELAY_MS).toBe(292);
    expect(editorEntranceDelay('left', 'left-surface', true)).toBe(220);
    expect(editorEntranceDelay('left', 'left-rail', true)).toBe(292);

    expect(EDITOR_DASHBOARD_RIGHT_SURFACE_DELAY_MS).toBe(238);
    expect(EDITOR_DASHBOARD_RIGHT_CONTENT_STAGGER_MS).toBe(92);
    expect(EDITOR_DASHBOARD_RIGHT_CONTENT_DELAY_MS).toBe(330);
    expect(editorEntranceDelay('right', 'right-surface', true)).toBe(238);
    expect(editorEntranceDelay('right', 'right-content', true)).toBe(330);

    expect(EDITOR_DASHBOARD_BOTTOM_STAGGER_MS).toBe(54);
    expect(EDITOR_DASHBOARD_BOTTOM_DELAY_MS).toBe(292);
    expect(editorEntranceDelay('bottom', 'default', true)).toBe(292);

    const inspectorProfile = editorSpringProfile('right', 'right-surface', true);
    expect(inspectorProfile).toBe(EDITOR_DASHBOARD_RIGHT_SURFACE_SPRING);
    expect(springOvershootRatio(inspectorProfile)).toBeGreaterThan(0.07);
    expect(editorSpringProfile('right', 'right-content', true)).toBe(EDITOR_SIDE_SPRING);

    const inspectorFrames = editorSpringKeyframes('right', 276, inspectorProfile);
    const translations = inspectorFrames.map((frame) => Number(String(frame.translate).split('px')[0]));
    expect(Math.min(...translations)).toBeLessThan(-8);
    expect(inspectorFrames[inspectorFrames.length - 1].translate).toBe('0px 0');
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

  it('lets the canvas lead the direct-load chrome without a loading shell', () => {
    expect(DIRECT_LOAD_RENDER_EVENT).toBe('revyme:render-complete');
    expect(DIRECT_LOAD_CHROME_STAGGER_MS).toBeGreaterThan(0);
    expect(DIRECT_LOAD_CHROME_STAGGER_MS).toBeLessThan(180);
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
