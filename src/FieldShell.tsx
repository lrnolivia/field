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
  const transitionTimerRef = useRef<number | null>(null);
  const showFrameRef = useRef<number | null>(null);
  const builderLayerRef = useRef<HTMLDivElement>(null);

  const setDashboardLayerState = useCallback((state: DashboardLayerState) => {
    dashboardStateRef.current = state;
    setDashboardState(state);
  }, []);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (showFrameRef.current !== null) {
      cancelAnimationFrame(showFrameRef.current);
      showFrameRef.current = null;
    }
  }, []);

  const showDashboardLayer = useCallback(() => {
    clearTransitionTimer();
    if (dashboardStateRef.current === 'visible') return;
    setDashboardLayerState('showing');
    showFrameRef.current = requestAnimationFrame(() => {
      showFrameRef.current = null;
      setDashboardLayerState('visible');
    });
  }, [clearTransitionTimer, setDashboardLayerState]);

  const hideDashboardLayer = useCallback(() => {
    clearTransitionTimer();
    if (dashboardStateRef.current === 'hidden' || dashboardStateRef.current === 'hiding') return;
    setDashboardLayerState('hiding');
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      setDashboardLayerState('hidden');
    }, 170);
  }, [clearTransitionTimer, setDashboardLayerState]);

  const maybeRevealProject = useCallback((id: string) => {
    if (builderReadyIdRef.current !== id) return;
    if (!revealRequestedRef.current || revealHeldRef.current) return;
    hideDashboardLayer();
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
      showDashboardLayer();
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
    showDashboardLayer();
    if (options.replace) {
      window.history.replaceState({ fieldSurface: 'dashboard' }, '', '/');
    } else if (!fieldPathIsDashboard(window.location.pathname)) {
      window.history.pushState({ fieldSurface: 'dashboard' }, '', '/');
    }
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

  useEffect(() => () => clearTransitionTimer(), [clearTransitionTimer]);

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
        className="field-dashboard-layer"
        data-state={dashboardState}
        aria-hidden={dashboardState === 'hidden' ? 'true' : undefined}
      >
        <Dashboard />
      </div>
    </div>
  );
}
