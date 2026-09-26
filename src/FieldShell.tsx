import { useCallback, useEffect, useRef, useState } from 'react';
import { getDefaultStore } from 'jotai';
import Dashboard from './Dashboard';
import ProjectLoader from './ProjectLoader';
import { flushNow } from '@/code/mutation/mutation-queue';
import { flushSaveNow } from '@/backend/autosave';
import { saveStatusAtom, type SaveStatus } from '@/backend/save-store';
import {
  registerFieldNavigationHandler,
  type FieldDashboardNavigationOptions,
  type FieldProjectNavigationOptions,
} from '@/backend/field-navigation';
import { setFieldProjectIdOverride } from '@/backend/project-id';
import { fieldBuilderProjectId, fieldPathIsDashboard } from './field-shell-route';
import { trace } from '@/shared/debug-trace';
import { requestEditorChromeExit } from '@/editor/editor-entrance';
import {
  DASHBOARD_EDITOR_HANDOFF_FRAMES,
  DASHBOARD_EXIT_DURATION_MS,
  DASHBOARD_EXIT_EASING,
  DASHBOARD_STRUCTURAL_SPRING,
  collectDashboardPanelTargets,
  dashboardEntranceKeyframes,
  dashboardExitKeyframes,
  dashboardPanelDelay,
  dashboardPanelOffscreenX,
  readTransformTranslateX,
  waitForAnimationFrames,
  type DashboardMotionDirection,
} from './field-shell-motion';

type DashboardLayerState = 'visible' | 'showing' | 'hiding' | 'hidden';

function projectUrl(id: string): string {
  return `/builder/${encodeURIComponent(id)}`;
}

function waitForSaveToSettle(timeoutMs = 12000): Promise<SaveStatus> {
  const store = getDefaultStore();
  const initial = store.get(saveStatusAtom);
  if (initial !== 'saving') return Promise.resolve(initial);

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = 0;
    const finish = (status: SaveStatus) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(status);
    };
    const unsubscribe = store.sub(saveStatusAtom, () => {
      const status = store.get(saveStatusAtom);
      if (status !== 'saving') finish(status);
    });
    timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      reject(new Error('Timed out waiting for the current project save to finish.'));
    }, timeoutMs);
  });
}

async function ensureCurrentProjectSavedBeforeSwitch(): Promise<void> {
  flushNow();
  const store = getDefaultStore();
  let status = store.get(saveStatusAtom);
  if (status === 'saving') status = await waitForSaveToSettle();
  if (status === 'unsaved') {
    await flushSaveNow();
    status = store.get(saveStatusAtom);
  }
  if (status === 'saving') status = await waitForSaveToSettle();
  if (status === 'error') {
    throw new Error('Resolve the current project save conflict before switching projects.');
  }
}

export default function FieldShell() {
  const initialProjectIdRef = useRef<string | null>(fieldBuilderProjectId(window.location.pathname));
  const didSeedProjectIdRef = useRef(false);
  if (!didSeedProjectIdRef.current) {
    didSeedProjectIdRef.current = true;
    if (initialProjectIdRef.current) setFieldProjectIdOverride(initialProjectIdRef.current);
  }

  const [builderId, setBuilderId] = useState<string | null>(initialProjectIdRef.current);
  const builderIdRef = useRef<string | null>(initialProjectIdRef.current);
  const builderReadyIdRef = useRef<string | null>(null);
  const [dashboardState, setDashboardState] = useState<DashboardLayerState>(
    fieldPathIsDashboard(window.location.pathname) ? 'visible' : 'hidden',
  );
  const dashboardStateRef = useRef<DashboardLayerState>(dashboardState);
  const revealHeldRef = useRef(false);
  const revealRequestedRef = useRef(false);
  const builderLayerRef = useRef<HTMLDivElement>(null);
  const dashboardLayerRef = useRef<HTMLDivElement>(null);
  const dashboardAnimationsRef = useRef<Array<{ element: HTMLElement; animation: Animation }>>([]);
  const dashboardMotionEpochRef = useRef(0);

  const setDashboardLayerState = useCallback((state: DashboardLayerState) => {
    dashboardStateRef.current = state;
    setDashboardState(state);
  }, []);

  const cancelDashboardMotion = useCallback((preserveVisual = true) => {
    dashboardMotionEpochRef.current += 1;
    for (const { element, animation } of dashboardAnimationsRef.current) {
      if (preserveVisual) {
        const current = window.getComputedStyle(element).transform;
        element.style.transform = current && current !== 'none'
          ? current
          : 'translate3d(0px, 0, 0)';
      }
      animation.cancel();
    }
    dashboardAnimationsRef.current = [];
  }, []);

  const clearDashboardInlineTransforms = useCallback((layer: HTMLElement | null) => {
    if (!layer) return;
    for (const { element } of collectDashboardPanelTargets(layer)) {
      element.style.transform = '';
    }
  }, []);

  const animateDashboardLayer = useCallback(async (
    direction: DashboardMotionDirection,
  ): Promise<void> => {
    const currentState = dashboardStateRef.current;
    if (direction === 'show' && currentState === 'visible') return;
    if (direction === 'hide' && currentState === 'hidden') return;

    const layer = dashboardLayerRef.current;
    cancelDashboardMotion(true);
    const epoch = dashboardMotionEpochRef.current;
    setDashboardLayerState(direction === 'show' ? 'showing' : 'hiding');

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const targets = layer ? collectDashboardPanelTargets(layer) : [];
    const canAnimate = targets.length > 0
      && targets.every(({ element }) => typeof element.animate === 'function');

    if (reducedMotion || !canAnimate) {
      clearDashboardInlineTransforms(layer);
      setDashboardLayerState(direction === 'show' ? 'visible' : 'hidden');
      return;
    }

    // Give React one paint to commit the new shell state before any slab moves.
    // On hide this is the editor coordinator's chance to park physical chrome
    // offscreen before Dashboard exposes a single pixel of Canvas. On show it
    // guarantees both Dashboard slabs are already offscreen before the layer
    // becomes visually active. This is a compositor handoff fence, not delay.
    await waitForAnimationFrames(1);
    if (dashboardMotionEpochRef.current !== epoch) return;

    const handles = targets.map(({ element, role }) => {
      const fromX = readTransformTranslateX(window.getComputedStyle(element).transform);
      const toX = direction === 'show'
        ? 0
        : dashboardPanelOffscreenX(role, element.getBoundingClientRect().width);
      const animation = element.animate(
        direction === 'show'
          ? dashboardEntranceKeyframes(fromX)
          : dashboardExitKeyframes(fromX, toX),
        {
          duration: direction === 'show'
            ? DASHBOARD_STRUCTURAL_SPRING.durationMs
            : DASHBOARD_EXIT_DURATION_MS,
          delay: dashboardPanelDelay(role, direction),
          easing: direction === 'show' ? 'linear' : DASHBOARD_EXIT_EASING,
          fill: 'both',
        },
      );
      return { element, animation, finalX: toX };
    });
    dashboardAnimationsRef.current = handles;

    await Promise.all(handles.map(({ animation }) => animation.finished.catch(() => undefined)));
    if (dashboardMotionEpochRef.current !== epoch) return;

    // Freeze the exact final transform in inline style BEFORE cancelling WAAPI
    // or flipping the shell state. This closes the one-frame ownership gap that
    // can otherwise flash the resting/offscreen CSS state through the compositor.
    for (const { element, animation, finalX } of handles) {
      element.style.transform = `translate3d(${finalX}px, 0, 0)`;
      animation.cancel();
    }
    dashboardAnimationsRef.current = [];

    setDashboardLayerState(direction === 'show' ? 'visible' : 'hidden');
    await waitForAnimationFrames(1);
    if (dashboardMotionEpochRef.current !== epoch) return;
    clearDashboardInlineTransforms(layer);
  }, [cancelDashboardMotion, clearDashboardInlineTransforms, setDashboardLayerState]);

  const showDashboardLayer = useCallback(() => animateDashboardLayer('show'), [animateDashboardLayer]);
  const hideDashboardLayer = useCallback(() => animateDashboardLayer('hide'), [animateDashboardLayer]);

  const maybeRevealProject = useCallback((id: string) => {
    if (builderReadyIdRef.current !== id) return;
    if (!revealRequestedRef.current || revealHeldRef.current) return;
    void hideDashboardLayer();
  }, [hideDashboardLayer]);

  const openProject = useCallback(async (
    id: string,
    options: FieldProjectNavigationOptions = {},
  ): Promise<void> => {
    const projectId = id.trim();
    if (!projectId) throw new Error('Project id is required');
    const current = builderIdRef.current;
    const switchingProjects = current !== null && current !== projectId;

    revealHeldRef.current = Boolean(options.holdReveal);
    revealRequestedRef.current = !options.holdReveal;

    if (current !== projectId) {
      void showDashboardLayer();
      if (switchingProjects) {
        trace.action('field-shell:project-switch-save', { from: current, to: projectId });
        await ensureCurrentProjectSavedBeforeSwitch();
      }

      setFieldProjectIdOverride(projectId);
      builderReadyIdRef.current = null;
      builderIdRef.current = projectId;
      setBuilderId(projectId);
      trace.action('field-shell:project-mounted', { projectId });
    } else {
      setFieldProjectIdOverride(projectId);
    }

    const nextUrl = projectUrl(projectId);
    if (options.replace) {
      window.history.replaceState({ fieldSurface: 'builder', projectId }, '', nextUrl);
    } else if (window.location.pathname !== nextUrl) {
      window.history.pushState({ fieldSurface: 'builder', projectId }, '', nextUrl);
    }

    if (current === projectId) maybeRevealProject(projectId);
  }, [maybeRevealProject, showDashboardLayer]);

  const showDashboard = useCallback(async (
    options: FieldDashboardNavigationOptions = {},
  ): Promise<void> => {
    revealHeldRef.current = false;
    revealRequestedRef.current = false;

    let editorExitPromise: Promise<void> | null = null;
    if (dashboardStateRef.current === 'hidden' && builderIdRef.current) {
      // The outgoing editor chrome now hands the edges directly to Dashboard.
      // Start that exit first, give it a tiny painted lead, then overlap the
      // incoming Dashboard slabs. This removes the bare, camera-composed Canvas
      // state that read as a shifted/broken duplicate during the handoff.
      trace.action('field-shell:editor-exit-start', { projectId: builderIdRef.current });
      editorExitPromise = requestEditorChromeExit(document);
      void editorExitPromise.then(() => {
        trace.action('field-shell:editor-exit-complete', { projectId: builderIdRef.current });
      });
    }

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (editorExitPromise && !reducedMotion) {
      trace.action('field-shell:editor-dashboard-overlap', { projectId: builderIdRef.current });
      await waitForAnimationFrames(DASHBOARD_EDITOR_HANDOFF_FRAMES);
    }

    const revealPromise = showDashboardLayer();
    if (options.replace) {
      window.history.replaceState({ fieldSurface: 'dashboard' }, '', '/');
    } else if (!fieldPathIsDashboard(window.location.pathname)) {
      window.history.pushState({ fieldSurface: 'dashboard' }, '', '/');
    }
    if (editorExitPromise) await Promise.all([editorExitPromise, revealPromise]);
    else await revealPromise;
    trace.action('field-shell:dashboard-visible', { projectId: builderIdRef.current });
  }, [showDashboardLayer]);

  const releaseProjectReveal = useCallback((id?: string) => {
    const current = builderIdRef.current;
    if (!current || (id && id !== current)) return;
    revealHeldRef.current = false;
    revealRequestedRef.current = true;
    maybeRevealProject(current);
  }, [maybeRevealProject]);

  useEffect(() => registerFieldNavigationHandler({
    openProject,
    showDashboard,
    releaseProjectReveal,
  }), [openProject, releaseProjectReveal, showDashboard]);

  useEffect(() => {
    const onPopState = () => {
      if (fieldPathIsDashboard(window.location.pathname)) {
        void showDashboard({ replace: true });
        return;
      }
      const projectId = fieldBuilderProjectId(window.location.pathname);
      if (!projectId) return;
      void openProject(projectId, { replace: true }).catch((error) => {
        console.warn('[field-shell] history project switch failed', error);
        void showDashboard({ replace: true });
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [openProject, showDashboard]);

  useEffect(() => {
    const builderLayer = builderLayerRef.current;
    if (!builderLayer) return;
    const blocked = dashboardState !== 'hidden';
    if (blocked) builderLayer.setAttribute('inert', '');
    else builderLayer.removeAttribute('inert');
    return () => builderLayer.removeAttribute('inert');
  }, [dashboardState]);

  useEffect(() => () => cancelDashboardMotion(false), [cancelDashboardMotion]);

  const onCanvasReady = useCallback((id: string) => {
    if (builderIdRef.current !== id) return;
    builderReadyIdRef.current = id;
    trace.action('field-shell:canvas-ready', { projectId: id });
    maybeRevealProject(id);
  }, [maybeRevealProject]);

  return (
    <div className="field-shell" data-dashboard-state={dashboardState}>
      <div
        ref={builderLayerRef}
        className="field-shell-builder"
        aria-hidden={dashboardState !== 'hidden' ? 'true' : undefined}
      >
        {builderId ? (
          <ProjectLoader
            key={builderId}
            onCanvasReady={() => onCanvasReady(builderId)}
          />
        ) : (
          <div className="field-shell-empty-canvas" aria-hidden="true" />
        )}
      </div>

      <div
        ref={dashboardLayerRef}
        className="field-dashboard-layer"
        data-state={dashboardState}
        aria-hidden={dashboardState === 'hidden' ? 'true' : undefined}
      >
        <Dashboard />
      </div>
    </div>
  );
}
