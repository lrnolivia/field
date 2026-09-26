// ProjectThumbnailCaptureHost.tsx — warm, best-effort dashboard thumbnail runtime.
//
// The dashboard thumbnail must feel immediate without keeping a permanent screenshot
// worker hot. This host therefore keeps ONE Preview sandbox instance per editor
// session, batches ProjectFS writes into it, captures only after persistence reaches
// `saved`, then parks the iframe with display:none and eventually destroys it after
// a longer idle window. The existing cached dashboard thumbnail remains untouched
// until a replacement upload succeeds.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { BACKEND_KIND } from '@/backend';
import {
  getFieldProjectThumbnailState,
  uploadFieldProjectThumbnail,
} from '@/backend/field-projects';
import { getProjectId } from '@/backend/project-id';
import { saveStatusAtom } from '@/backend/save-store';
import { projectFS, type ProjectFSWriteEvent } from '@/code/project/project-fs';
import { activeLocaleAtom } from '@/code/stores/locale-store';
import { filePathToSlug } from '@/code/project/active-file-store';
import {
  chooseDashboardThumbnailPage,
  dashboardThumbnailPageUrl,
} from '@/preview/dashboard-thumbnail-page';
import {
  collectPreviewProjectPayload,
  postPreviewProjectPayload,
} from '@/preview/preview-project-payload';
import { trace } from '@/shared/debug-trace';
import { shouldScheduleThumbnailCapture } from './project-thumbnail-capture-state';

const UPDATE_BATCH_MS = 140;
const CAPTURE_AFTER_SAVE_MS = 120;
const CAPTURE_WATCHDOG_MS = 5000;
const READY_PROBE_MS = 250;
const STANDBY_IDLE_MS = 8000;
const DESTROY_IDLE_MS = 90000;
const MAX_CAPTURE_RETRIES = 1;

function previewOrigin(): string {
  if (typeof window === 'undefined') return 'http://localhost:5175';
  return window.location.port
    ? `${window.location.protocol}//${window.location.hostname}:5175`
    : `${window.location.protocol}//preview.${window.location.hostname}`;
}

function requestId(prefix = 'field-thumb'): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizePreviewPath(value: unknown): string {
  if (typeof value !== 'string' || !value) return '/';
  try {
    return new URL(value, window.location.origin).pathname || '/';
  } catch {
    return value.split('?')[0] || '/';
  }
}

function routeStructureChanged(event: ProjectFSWriteEvent): boolean {
  if (event.kind === 'delete' || event.kind === 'move' || event.kind === 'load-snapshot') return true;
  const path = event.path ?? '';
  return path.startsWith('app/') && (
    path.endsWith('/page.tsx') ||
    path === 'app/page.tsx' ||
    path.endsWith('/layout.tsx') ||
    path === 'app/layout.tsx'
  );
}

interface Props {
  /** Visible Preview owns the Preview runtime while open; hidden capture yields. */
  suspended: boolean;
}

interface CaptureAttempt {
  requestId: string;
  generation: number;
  startedAt: number;
  retry: number;
}

export default function ProjectThumbnailCaptureHost({ suspended }: Props) {
  const saveStatus = useAtomValue(saveStatusAtom);
  const activeLocale = useAtomValue(activeLocaleAtom);
  const projectId = getProjectId();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const generationRef = useRef(0);
  const lastSuccessfulGenerationRef = useRef(0);
  const lastFailedGenerationRef = useRef(-1);
  const rendererSessionIdRef = useRef(requestId('field-thumb-runtime'));
  const expectedPathRef = useRef<string | null>(null);
  const rendererReadyRef = useRef(false);
  const rendererAwakeRef = useRef(false);
  const rendererMountedRef = useRef(false);
  const saveStatusRef = useRef(saveStatus);
  const activeLocaleRef = useRef(activeLocale);
  const suspendedRef = useRef(suspended);
  const captureAttemptRef = useRef<CaptureAttempt | null>(null);
  const captureRetryRef = useRef(0);
  const captureWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadInFlightRef = useRef(false);
  const pendingWritesRef = useRef<Map<string, string>>(new Map());
  const pendingFullSyncRef = useRef(false);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationPulseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const standbyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [generation, setGeneration] = useState(0);
  const [mainBranchActive, setMainBranchActive] = useState(() => projectFS.isMainActive());
  const [needsInitialCapture, setNeedsInitialCapture] = useState<boolean | null>(null);
  const [rendererMounted, setRendererMounted] = useState(false);
  const [rendererAwake, setRendererAwake] = useState(false);
  const [rendererEpoch, setRendererEpoch] = useState(0);
  const [rendererReady, setRendererReady] = useState(false);
  const [renderedGeneration, setRenderedGeneration] = useState(-1);
  const [captureSerial, setCaptureSerial] = useState(0);

  const clearCaptureWatchdog = () => {
    if (captureWatchdogRef.current !== null) clearTimeout(captureWatchdogRef.current);
    captureWatchdogRef.current = null;
  };

  const clearLifecycleTimers = () => {
    if (standbyTimerRef.current !== null) clearTimeout(standbyTimerRef.current);
    if (destroyTimerRef.current !== null) clearTimeout(destroyTimerRef.current);
    standbyTimerRef.current = null;
    destroyTimerRef.current = null;
  };

  const setAwake = (awake: boolean) => {
    rendererAwakeRef.current = awake;
    setRendererAwake(awake);
  };

  const ensureRendererAwake = () => {
    clearLifecycleTimers();
    if (!rendererMountedRef.current) {
      rendererMountedRef.current = true;
      rendererReadyRef.current = false;
      rendererSessionIdRef.current = requestId('field-thumb-runtime');
      expectedPathRef.current = null;
      setRendererReady(false);
      setRenderedGeneration(-1);
      setRendererEpoch((value) => value + 1);
      setRendererMounted(true);
      trace.action('dashboard-thumbnail:warm-mounted', { projectId });
    }
    setAwake(true);
  };

  const disposeRenderer = (reason: string) => {
    clearLifecycleTimers();
    if (updateTimerRef.current !== null) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = null;
    pendingWritesRef.current.clear();
    pendingFullSyncRef.current = false;
    captureAttemptRef.current = null;
    captureRetryRef.current = 0;
    clearCaptureWatchdog();
    uploadInFlightRef.current = false;
    rendererReadyRef.current = false;
    rendererMountedRef.current = false;
    rendererAwakeRef.current = false;
    expectedPathRef.current = null;
    setRendererReady(false);
    setRenderedGeneration(-1);
    setRendererAwake(false);
    setRendererMounted(false);
    trace.action('dashboard-thumbnail:warm-destroyed', { projectId, reason });
  };

  const armIdleLifecycle = () => {
    clearLifecycleTimers();
    standbyTimerRef.current = setTimeout(() => {
      if (captureAttemptRef.current || uploadInFlightRef.current) return;
      if (generationRef.current !== lastSuccessfulGenerationRef.current) return;
      setAwake(false);
      trace.action('dashboard-thumbnail:warm-standby', {
        projectId,
        generation: generationRef.current,
      });
    }, STANDBY_IDLE_MS);
    destroyTimerRef.current = setTimeout(() => {
      if (captureAttemptRef.current || uploadInFlightRef.current) return;
      if (generationRef.current !== lastSuccessfulGenerationRef.current) return;
      disposeRenderer('idle');
    }, DESTROY_IDLE_MS);
  };

  const postFullProject = (reason: string) => {
    const contentWindow = iframeRef.current?.contentWindow;
    if (!contentWindow || !rendererReadyRef.current || !rendererAwakeRef.current) return;
    if (!projectFS.isMainActive()) return;

    const payload = collectPreviewProjectPayload(activeLocaleRef.current);
    const page = chooseDashboardThumbnailPage(projectFS.listFiles('app/'));
    if (!page) {
      lastFailedGenerationRef.current = generationRef.current;
      trace.warn('dashboard-thumbnail:capture-failed', {
        projectId,
        generation: generationRef.current,
        reason: 'no-page',
      });
      return;
    }

    const syncGeneration = generationRef.current;
    const expectedPath = dashboardThumbnailPageUrl(page);
    expectedPathRef.current = expectedPath;
    contentWindow.postMessage({
      type: 'preview:thumbnail-session',
      requestId: rendererSessionIdRef.current,
    }, '*');
    contentWindow.postMessage({
      type: 'preview:thumbnail-generation',
      generation: syncGeneration,
    }, '*');
    postPreviewProjectPayload(contentWindow, payload, '*');
    contentWindow.postMessage({ type: 'preview:component', filePath: null }, '*');
    contentWindow.postMessage({
      type: 'preview:variant-page',
      variantFilePath: null,
      basePagePath: null,
    }, '*');
    contentWindow.postMessage({ type: 'preview:navigate', url: expectedPath }, '*');
    pendingWritesRef.current.clear();
    pendingFullSyncRef.current = false;
    trace.action('dashboard-thumbnail:warm-sync', {
      projectId,
      mode: 'full',
      reason,
      generation: syncGeneration,
      page,
      slug: filePathToSlug(page),
      route: expectedPath,
      fileCount: payload.files.length,
    });
  };

  const flushIncrementalUpdates = () => {
    updateTimerRef.current = null;
    if (!rendererReadyRef.current || !rendererAwakeRef.current) return;
    if (!projectFS.isMainActive()) return;

    if (pendingFullSyncRef.current) {
      postFullProject('structural-change');
      return;
    }

    const files = [...pendingWritesRef.current.entries()];
    if (files.length === 0) return;
    pendingWritesRef.current.clear();
    const syncGeneration = generationRef.current;
    const contentWindow = iframeRef.current?.contentWindow;
    if (!contentWindow) return;
    contentWindow.postMessage({
      type: 'preview:thumbnail-generation',
      generation: syncGeneration,
    }, '*');
    contentWindow.postMessage({ type: 'preview:file-batch', files }, '*');
    trace.action('dashboard-thumbnail:warm-sync', {
      projectId,
      mode: 'batch',
      generation: syncGeneration,
      fileCount: files.length,
    });
  };

  const scheduleIncrementalFlush = () => {
    if (updateTimerRef.current !== null) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(flushIncrementalUpdates, UPDATE_BATCH_MS);
  };

  const failCaptureAttempt = (attempt: CaptureAttempt, reason: string, error?: unknown) => {
    clearCaptureWatchdog();
    if (captureAttemptRef.current?.requestId !== attempt.requestId) return;
    captureAttemptRef.current = null;
    const canRetry =
      captureRetryRef.current < MAX_CAPTURE_RETRIES &&
      generationRef.current === attempt.generation &&
      saveStatusRef.current === 'saved' &&
      rendererReadyRef.current &&
      rendererAwakeRef.current &&
      !suspendedRef.current;
    if (canRetry) {
      captureRetryRef.current += 1;
      trace.warn('dashboard-thumbnail:capture-retry', {
        projectId,
        generation: attempt.generation,
        retry: captureRetryRef.current,
        reason,
        ...(error === undefined ? {} : { error: String(error) }),
      });
    } else {
      lastFailedGenerationRef.current = attempt.generation;
      trace.warn('dashboard-thumbnail:capture-failed', {
        projectId,
        generation: attempt.generation,
        requestId: attempt.requestId,
        reason,
        ...(error === undefined ? {} : { error: String(error) }),
      });
    }
    setCaptureSerial((value) => value + 1);
  };

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    activeLocaleRef.current = activeLocale;
    if (!rendererReadyRef.current || !rendererMountedRef.current) return;
    ensureRendererAwake();
    postFullProject('locale-change');
  }, [activeLocale]);

  useEffect(() => {
    suspendedRef.current = suspended;
    if (suspended && rendererMountedRef.current) disposeRenderer('visible-preview');
  }, [suspended]);

  useEffect(() => {
    if (BACKEND_KIND !== 'field' || suspended) return;
    let cancelled = false;
    setNeedsInitialCapture(null);
    void getFieldProjectThumbnailState(projectId)
      .then((state) => {
        if (cancelled) return;
        const needsCapture = !state.exists || state.stale;
        setNeedsInitialCapture(needsCapture);
        trace.action('dashboard-thumbnail:freshness', {
          projectId,
          exists: state.exists,
          stale: state.stale,
          projectUpdatedAt: state.projectUpdatedAt,
          thumbnailUpdatedAt: state.thumbnailUpdatedAt,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setNeedsInitialCapture(false);
        trace.error('dashboard-thumbnail:freshness-failed', { projectId, error: String(error) });
      });
    return () => { cancelled = true; };
  }, [projectId, suspended]);

  useEffect(() => {
    const unsubscribeWrites = projectFS.subscribeWrites((event) => {
      generationRef.current += 1;
      lastFailedGenerationRef.current = -1;
      captureRetryRef.current = 0;
      setMainBranchActive(projectFS.isMainActive());
      ensureRendererAwake();

      if (routeStructureChanged(event)) {
        pendingFullSyncRef.current = true;
        pendingWritesRef.current.clear();
      } else if (event.kind === 'write' && event.path && typeof event.content === 'string') {
        pendingWritesRef.current.set(event.path, event.content);
      }
      scheduleIncrementalFlush();

      if (generationPulseRef.current !== null) clearTimeout(generationPulseRef.current);
      generationPulseRef.current = setTimeout(() => {
        generationPulseRef.current = null;
        setGeneration(generationRef.current);
      }, UPDATE_BATCH_MS);
    });

    const unsubscribeCoarse = projectFS.subscribe(() => {
      setMainBranchActive(projectFS.isMainActive());
    });

    return () => {
      unsubscribeWrites();
      unsubscribeCoarse();
      if (generationPulseRef.current !== null) clearTimeout(generationPulseRef.current);
      generationPulseRef.current = null;
    };
  }, []);

  useEffect(() => {
    const shouldWake = shouldScheduleThumbnailCapture({
      isFieldBackend: BACKEND_KIND === 'field',
      suspended,
      mainBranchActive,
      saveStatus,
      captureActive: captureAttemptRef.current !== null || uploadInFlightRef.current,
      needsInitialCapture,
      generation,
      lastSuccessfulGeneration: lastSuccessfulGenerationRef.current,
      lastFailedGeneration: lastFailedGenerationRef.current,
    });
    if (!shouldWake) return;
    ensureRendererAwake();
  }, [generation, mainBranchActive, needsInitialCapture, saveStatus, suspended]);

  useEffect(() => {
    if (!rendererReady || !rendererAwake || suspended || !mainBranchActive) return;
    if (saveStatus !== 'saved') return;
    if (captureAttemptRef.current || uploadInFlightRef.current) return;
    const currentGeneration = generationRef.current;
    if (renderedGeneration !== currentGeneration) return;
    if (currentGeneration === lastFailedGenerationRef.current) return;
    const needsWork = needsInitialCapture === true || currentGeneration > lastSuccessfulGenerationRef.current;
    if (!needsWork) return;

    const timer = setTimeout(() => {
      if (saveStatusRef.current !== 'saved' || suspendedRef.current) return;
      if (!rendererReadyRef.current || !rendererAwakeRef.current) return;
      if (generationRef.current !== currentGeneration) return;
      if (captureAttemptRef.current || uploadInFlightRef.current) return;
      const contentWindow = iframeRef.current?.contentWindow;
      if (!contentWindow) return;

      const attempt: CaptureAttempt = {
        requestId: requestId('field-thumb-capture'),
        generation: currentGeneration,
        startedAt: performance.now(),
        retry: captureRetryRef.current,
      };
      captureAttemptRef.current = attempt;
      contentWindow.postMessage({
        type: 'preview:capture-thumbnail',
        requestId: attempt.requestId,
      }, '*');
      clearCaptureWatchdog();
      captureWatchdogRef.current = setTimeout(() => {
        failCaptureAttempt(attempt, 'timeout');
      }, CAPTURE_WATCHDOG_MS);
      setCaptureSerial((value) => value + 1);
      trace.action('dashboard-thumbnail:capture-requested', {
        projectId,
        requestId: attempt.requestId,
        generation: currentGeneration,
        warm: true,
      });
    }, CAPTURE_AFTER_SAVE_MS);

    return () => clearTimeout(timer);
  }, [
    captureSerial,
    generation,
    mainBranchActive,
    needsInitialCapture,
    renderedGeneration,
    rendererAwake,
    rendererReady,
    saveStatus,
    suspended,
  ]);

  useLayoutEffect(() => {
    if (!rendererMounted) return;
    const iframe = iframeRef.current;
    const contentWindow = iframe?.contentWindow;
    if (!iframe || !contentWindow) return;

    let stopped = false;
    let readySeen = false;

    rendererReadyRef.current = false;
    setRendererReady(false);

    const sendReadyProbe = () => {
      if (stopped || readySeen) return;
      contentWindow.postMessage({ type: 'preview:probe-ready' }, '*');
    };
    const probeTimer = setInterval(sendReadyProbe, READY_PROBE_MS);
    sendReadyProbe();

    const handler = (event: MessageEvent) => {
      if (event.source !== contentWindow) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      if (message.type === 'preview:ready' && !readySeen) {
        readySeen = true;
        clearInterval(probeTimer);
        rendererReadyRef.current = true;
        setRendererReady(true);
        trace.action('dashboard-thumbnail:warm-ready', {
          projectId,
          sessionId: rendererSessionIdRef.current,
        });
        postFullProject('renderer-ready');
        return;
      }

      if (message.type === 'preview:project-received') {
        if (message.requestId !== rendererSessionIdRef.current) return;
        trace.action('dashboard-thumbnail:project-received', {
          projectId,
          sessionId: rendererSessionIdRef.current,
        });
        return;
      }

      if (message.type === 'preview:rendered') {
        if (message.requestId !== rendererSessionIdRef.current) return;
        const messageGeneration = typeof message.generation === 'number' ? message.generation : -1;
        if (messageGeneration < 0) return;
        const expectedPath = expectedPathRef.current;
        if (!expectedPath || normalizePreviewPath(message.url) !== expectedPath) return;
        if (messageGeneration !== generationRef.current) return;
        setRenderedGeneration(messageGeneration);
        trace.action('dashboard-thumbnail:first-page-rendered', {
          projectId,
          route: expectedPath,
          generation: messageGeneration,
          warm: true,
        });
        return;
      }

      if (message.type === 'preview:thumbnail-error') {
        const attempt = captureAttemptRef.current;
        if (!attempt || message.requestId !== attempt.requestId) return;
        failCaptureAttempt(attempt, 'raster', message.error);
        return;
      }

      if (message.type !== 'preview:thumbnail') return;
      const attempt = captureAttemptRef.current;
      if (!attempt || message.requestId !== attempt.requestId) return;
      clearCaptureWatchdog();
      const dataUrl = message.dataUrl;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        failCaptureAttempt(attempt, 'bad-payload');
        return;
      }
      if (
        generationRef.current !== attempt.generation ||
        saveStatusRef.current !== 'saved' ||
        suspendedRef.current
      ) {
        captureAttemptRef.current = null;
        setCaptureSerial((value) => value + 1);
        trace.action('dashboard-thumbnail:discarded-stale', {
          projectId,
          requestId: attempt.requestId,
          sessionGeneration: attempt.generation,
          currentGeneration: generationRef.current,
          stage: 'before-upload',
          saveStatus: saveStatusRef.current,
        });
        return;
      }

      trace.action('dashboard-thumbnail:raster-received', {
        projectId,
        requestId: attempt.requestId,
        generation: attempt.generation,
        chars: dataUrl.length,
        rasterMs: Math.round(performance.now() - attempt.startedAt),
      });
      uploadInFlightRef.current = true;
      void uploadFieldProjectThumbnail(projectId, dataUrl)
        .then((url) => {
          uploadInFlightRef.current = false;
          captureAttemptRef.current = null;
          const current = generationRef.current;
          if (current !== attempt.generation || saveStatusRef.current !== 'saved' || suspendedRef.current) {
            trace.warn('dashboard-thumbnail:upload-stale-race', {
              projectId,
              generation: attempt.generation,
              currentGeneration: current,
              requestId: attempt.requestId,
              url,
            });
            setCaptureSerial((value) => value + 1);
            return;
          }
          lastSuccessfulGenerationRef.current = attempt.generation;
          lastFailedGenerationRef.current = -1;
          captureRetryRef.current = 0;
          setNeedsInitialCapture(false);
          setCaptureSerial((value) => value + 1);
          trace.action('dashboard-thumbnail:upload-success', {
            projectId,
            generation: attempt.generation,
            requestId: attempt.requestId,
            url,
            totalMs: Math.round(performance.now() - attempt.startedAt),
            warm: true,
          });
          armIdleLifecycle();
        })
        .catch((error) => {
          uploadInFlightRef.current = false;
          failCaptureAttempt(attempt, 'upload', error);
        });
    };

    window.addEventListener('message', handler);
    return () => {
      stopped = true;
      clearInterval(probeTimer);
      clearCaptureWatchdog();
      window.removeEventListener('message', handler);
    };
  }, [projectId, rendererEpoch, rendererMounted]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) return;
      if (captureAttemptRef.current || uploadInFlightRef.current) return;
      if (needsInitialCapture === true || generationRef.current !== lastSuccessfulGenerationRef.current) return;
      setAwake(false);
      trace.action('dashboard-thumbnail:warm-standby', {
        projectId,
        generation: generationRef.current,
        reason: 'document-hidden',
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [needsInitialCapture, projectId]);

  useEffect(() => () => {
    clearLifecycleTimers();
    if (updateTimerRef.current !== null) clearTimeout(updateTimerRef.current);
    if (generationPulseRef.current !== null) clearTimeout(generationPulseRef.current);
    clearCaptureWatchdog();
  }, []);

  if (BACKEND_KIND !== 'field' || suspended || !rendererMounted) return null;

  return (
    <iframe
      key={rendererEpoch}
      ref={iframeRef}
      src={`${previewOrigin()}/`}
      aria-hidden="true"
      tabIndex={-1}
      title=""
      allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
      style={{
        position: 'fixed',
        left: '-10000px',
        top: 0,
        width: 1440,
        height: 900,
        border: 0,
        display: rendererAwake ? 'block' : 'none',
        opacity: 0.001,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
