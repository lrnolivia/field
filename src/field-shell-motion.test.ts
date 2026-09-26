import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  EDITOR_EXIT_EASING,
  EDITOR_EXIT_SIDE_DURATION_MS,
  EDITOR_SIDE_SPRING,
} from '@/editor/editor-entrance';
import {
  DASHBOARD_CANVAS_BEAT_FRAMES,
  DASHBOARD_EXIT_DURATION_MS,
  DASHBOARD_EXIT_EASING,
  DASHBOARD_PANEL_STAGGER_MS,
  DASHBOARD_STRUCTURAL_SPRING,
  dashboardEntranceKeyframes,
  dashboardExitKeyframes,
  dashboardPanelDelay,
  dashboardPanelOffscreenX,
  readTransformTranslateX,
  waitForAnimationFrames,
} from './field-shell-motion';

describe('field shell seamless Dashboard/Canvas motion contract', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src/styles/field-shell.css'), 'utf8');
  const shell = fs.readFileSync(path.join(process.cwd(), 'src/FieldShell.tsx'), 'utf8');

  it('inherits the editor structural motion language instead of inventing another one', () => {
    expect(DASHBOARD_STRUCTURAL_SPRING).toBe(EDITOR_SIDE_SPRING);
    expect(DASHBOARD_STRUCTURAL_SPRING).toMatchObject({
      stiffness: 520,
      damping: 42.3,
      mass: 0.86,
      durationMs: 340,
    });
    expect(DASHBOARD_EXIT_DURATION_MS).toBe(EDITOR_EXIT_SIDE_DURATION_MS);
    expect(DASHBOARD_EXIT_DURATION_MS).toBe(220);
    expect(DASHBOARD_EXIT_EASING).toBe(EDITOR_EXIT_EASING);
  });

  it('keeps structural slabs monotonic with exact edge settle and no rebound', () => {
    const sidebar = dashboardEntranceKeyframes(-232);
    const main = dashboardEntranceKeyframes(1216);
    const sidebarX = sidebar.map((frame) => Number(String(frame.transform).match(/translate3d\((-?[0-9.]+)px/)?.[1] ?? 0));
    const mainX = main.map((frame) => Number(String(frame.transform).match(/translate3d\((-?[0-9.]+)px/)?.[1] ?? 0));

    expect(sidebarX.every((value) => value <= 0)).toBe(true);
    expect(mainX.every((value) => value >= 0)).toBe(true);
    expect(sidebar[sidebar.length - 1].transform).toBe('translate3d(0px, 0, 0)');
    expect(main[main.length - 1].transform).toBe('translate3d(0px, 0, 0)');
  });

  it('uses the editor-like 18ms structural stagger with reversed ownership', () => {
    expect(DASHBOARD_PANEL_STAGGER_MS).toBe(18);
    expect(dashboardPanelDelay('sidebar', 'hide')).toBe(0);
    expect(dashboardPanelDelay('main', 'hide')).toBe(18);
    expect(dashboardPanelDelay('main', 'show')).toBe(0);
    expect(dashboardPanelDelay('sidebar', 'show')).toBe(18);
  });

  it('keeps the website exposed for two painted frames between ownership changes', async () => {
    expect(DASHBOARD_CANVAS_BEAT_FRAMES).toBe(2);
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const pending = waitForAnimationFrames(2, raf);
    expect(callbacks).toHaveLength(1);
    callbacks.shift()?.(0);
    expect(callbacks).toHaveLength(1);
    callbacks.shift()?.(16);
    await pending;
    expect(raf).toHaveBeenCalledTimes(2);
  });

  it('moves slabs fully offscreen and exits without a reverse spring', () => {
    expect(dashboardPanelOffscreenX('sidebar', 216)).toBe(-232);
    expect(dashboardPanelOffscreenX('main', 1200)).toBe(1216);
    expect(dashboardExitKeyframes(0, -232)).toEqual([
      { offset: 0, transform: 'translate3d(0px, 0, 0)' },
      { offset: 1, transform: 'translate3d(-232px, 0, 0)' },
    ]);
  });

  it('removes CSS-timed motion and lets real WAAPI completion own shell state', () => {
    expect(css).not.toContain('transition: transform 360ms');
    expect(css).not.toContain('transition: transform 420ms');
    expect(css).not.toContain('cubic-bezier(.2, 1.12, .3, 1)');
    expect(css).toContain(".field-dashboard-layer[data-state='hidden'] .field-dashboard-sidebar");
    expect(css).toContain(".field-dashboard-layer[data-state='hidden'] .field-dashboard-main");
    expect(shell).toContain('animation.finished.catch');
    expect(shell).not.toContain('}, 480);');
  });

  it('preserves the Canvas exit -> clean Canvas beat -> Dashboard return ordering', () => {
    const exitIndex = shell.indexOf('await requestEditorChromeExit(document);');
    const beatIndex = shell.indexOf('await waitForAnimationFrames(DASHBOARD_CANVAS_BEAT_FRAMES);', exitIndex);
    const showIndex = shell.indexOf('const revealPromise = showDashboardLayer();', beatIndex);
    expect(exitIndex).toBeGreaterThan(-1);
    expect(beatIndex).toBeGreaterThan(exitIndex);
    expect(showIndex).toBeGreaterThan(beatIndex);
  });

  it('keeps the builder visually live until Dashboard actually starts reclaiming the screen', () => {
    const start = shell.indexOf('const showDashboard = useCallback');
    const end = shell.indexOf('const releaseProjectReveal = useCallback', start);
    const showDashboardSource = shell.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(showDashboardSource).toContain('await requestEditorChromeExit(document);');
    expect(showDashboardSource).not.toContain("builderLayerRef.current?.setAttribute('inert', '');");
  });

  it('hardens the WAAPI-to-CSS handoff without a visibility/compositor flip', () => {
    expect(shell).toContain('finalX: toX');
    expect(shell).toContain('Freeze the exact final transform in inline style BEFORE cancelling WAAPI');
    expect(shell).toContain('element.style.transform = `translate3d(${finalX}px, 0, 0)`');
    expect(css).not.toContain(".field-dashboard-layer[data-state='hidden'] {\n  visibility: hidden;\n}");
    expect(css).toContain('continuously composited while hidden');
  });

  it('keeps reduced motion and interruption-safe transform reads', () => {
    expect(shell).toContain("window.matchMedia?.('(prefers-reduced-motion: reduce)').matches");
    expect(readTransformTranslateX('none')).toBe(0);
    expect(readTransformTranslateX('matrix(1, 0, 0, 1, -83.5, 0)')).toBe(-83.5);
    expect(readTransformTranslateX('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,41.25,0,0,1)')).toBe(41.25);
  });
});
