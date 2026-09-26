import { describe, expect, it } from 'vitest';
import {
  collectEditorEntranceTargets,
  editorEntranceDelay,
  editorEntranceDistances,
  editorSpringKeyframes,
  EDITOR_BOTTOM_DELAY_MS,
  EDITOR_BOTTOM_SPRING,
  EDITOR_SIDE_SPRING,
  readFieldDashboardLayerState,
  springDisplacement,
  springOvershootRatio,
} from './editor-entrance';

describe('editor entrance choreography', () => {
  it('targets the physical ChromeIslands together with their content', () => {
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

  it('uses actual under-damped spring physics with a restrained side overshoot', () => {
    expect(EDITOR_SIDE_SPRING).toMatchObject({
      stiffness: 470,
      damping: 32,
      mass: 0.82,
    });
    const overshoot = springOvershootRatio(EDITOR_SIDE_SPRING);
    expect(overshoot).toBeGreaterThan(0.008);
    expect(overshoot).toBeLessThan(0.02);

    const frames = editorSpringKeyframes('left', -320);
    const translations = frames.map((frame) => Number(String(frame.translate).split('px')[0]));
    expect(translations.some((value) => value > 2)).toBe(true);
    expect(frames[frames.length - 1].translate).toBe('0px 0');
  });

  it('gives the bottom toolbar a materially bouncier spring and a small delayed entrance', () => {
    expect(EDITOR_BOTTOM_SPRING).toMatchObject({
      stiffness: 390,
      damping: 20,
      mass: 0.88,
    });
    expect(editorEntranceDelay('bottom')).toBe(EDITOR_BOTTOM_DELAY_MS);
    expect(EDITOR_BOTTOM_DELAY_MS).toBe(42);

    const bottomOvershoot = springOvershootRatio(EDITOR_BOTTOM_SPRING);
    const sideOvershoot = springOvershootRatio(EDITOR_SIDE_SPRING);
    expect(bottomOvershoot).toBeGreaterThan(0.1);
    expect(bottomOvershoot).toBeGreaterThan(sideOvershoot * 5);

    const frames = editorSpringKeyframes('bottom', 90);
    const translations = frames.map((frame) => {
      const match = String(frame.translate).match(/0 (-?[0-9.]+)px/);
      return match ? Number(match[1]) : 0;
    });
    expect(Math.min(...translations)).toBeLessThan(-8);
    expect(frames[frames.length - 1].translate).toBe('0 0px');
  });

  it('reads FieldShell hidden as the authoritative Dashboard completion state', () => {
    document.body.innerHTML = `<div class="field-shell" data-dashboard-state="hiding"></div>`;
    expect(readFieldDashboardLayerState(document)).toBe('hiding');

    const shell = document.querySelector<HTMLElement>('.field-shell')!;
    shell.dataset.dashboardState = 'hidden';
    expect(readFieldDashboardLayerState(document)).toBe('hidden');
  });

  it('spring displacement crosses rest and decays toward zero', () => {
    expect(springDisplacement(0, EDITOR_BOTTOM_SPRING)).toBeCloseTo(1, 6);
    expect(springDisplacement(0.18, EDITOR_BOTTOM_SPRING)).toBeLessThan(0);
    expect(Math.abs(springDisplacement(0.5, EDITOR_BOTTOM_SPRING))).toBeLessThan(0.01);
  });
});
