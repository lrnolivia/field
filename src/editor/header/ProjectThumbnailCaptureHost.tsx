// ProjectThumbnailCaptureHost.tsx — invisible, best-effort dashboard thumbnail refresh.
//
// Uses the REAL Preview sandbox and waits for an explicit render acknowledgement
// before asking it to rasterize the canonical first Page. The iframe is a real
// 1440×900 offscreen document: dashboard cards remain static cached images.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { BACKEND_KIND } from '@/backend';
import {
  getFieldProjectThumbnailState,
  uploadFieldProjectThumbnail,
} from '@/backend/field-projects';
import { getProjectId } from '@/backend/project-id';
import { saveStatusAtom } from '@/backend/save-store';
import { projectFS } from '@/code/project/project-fs';
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

const CAPTURE_DELAY_MS = 1500;
const CAPTURE_TIMEOUT_MS = 24000;
const CHANGE_PULSE_MS = 250;
const READY_PROBE_MS = 250;
const MAX_SESSION_RETRIES = 2;

function previewOrigin(): string {
  if (typeof window === 'undefined') return 'http://localhost:5175';
  return window.location.port
    ? `${window.location.protocol}//${window.location.hostname}:5175`
    : `${window.location.protocol}//preview.${window.location.hostname}`;
}

function requestId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `field-thumb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizePreviewPath(value: unknown): string {
  if (typeof value !== 'string' || !value) return '/';
  try {
    return new URL(value, window.location.origin).pathname || '/';
  } catch {
    return value.split('?')[0] || '/';
  }
}

interface Props {
  /** Visible Preview owns the Preview runtime while open; hidden capture yields. */
  suspended: boolean;
}

interface CaptureSession {
  key: number;
  generation: number;
  requestId: string;
}

export default function ProjectThumbnailCaptureHost({ suspended }: Props) {
  const saveStatus = useAtomValue(saveStatusAtom);
  const activeLocale = useAtomValue(activeLocaleAtom);
  const projectId = getProjectId();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const generationRef = useRef(0);
  const lastSuccessfulGenerationRef = useRef(0);
  const lastFailedGenerationRef = useRef(-1);
  const uploadInFlightRef = useRef(false);
  const sessionSerialRef = useRef(0);
  const retryCountRef = useRef(0);
  const [generation, setGeneration] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [mainBranchActive, setMainBranchActive] = useState(() => projectFS.isMainActive());
  const [needsInitialCapture, setNeedsInitialCapture] = useState<boolean | null>(null);
  const [captureSession, setCaptureSession] = useState<CaptureSession | null>(null);

  useEffect(() => {
    let pulse: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = projectFS.subscribe(() => {
      generationRef.current += 1;
      retryCountRef.current = 0;
      lastFailedGenerationRef.current = -1;
      setMainBranchActive(projectFS.isMainActive());
      if (pulse !== null) clearTimeout(pulse);
      pulse = setTimeout(() => {
        pulse = null;
        setGeneration(generationRef.current);
      }, CHANGE_PULSE_MS);
    });
    return () => {
      unsubscribe();
      if (pulse !== null) clearTimeout(pulse);
    };
  }, []);

  useEffect(() => {
    if (BACKEND_KIND !== 'field' || suspended) return;
    let cancelled = false;
    setNeedsInitialCapture(null);
    void getFieldProjectThumbnailState(projectId)
      .then((state) => {
        if (cancelled) return;
        const needsCapture = !state.exists || state.stale;
        setNeedsInitialCapture(needsCapture);
        if (!needsCapture) retryCountRef.current = 0;
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
    if (suspended && captureSession) {
      uploadInFlightRef.current = false;
      setCaptureSession(null);
    }
  }, [captureSession, suspended]);

  useEffect(() => {
    void retryTick;
    const shouldSchedule = shouldScheduleThumbnailCapture({
      isFieldBackend: BACKEND_KIND === 'field',
      suspended,
      mainBranchActive,
      saveStatus,
      captureActive: captureSession !== null,
      needsInitialCapture,
      generation,
      lastSuccessfulGeneration: lastSuccessfulGenerationRef.current,
      lastFailedGeneration: lastFailedGenerationRef.current,
    });
    if (!shouldSchedule) return;

    const timer = setTimeout(() => {
      if (!projectFS.isMainActive()) return;
      const next: CaptureSession = {
        key: ++sessionSerialRef.current,
        generation: generationRef.current,
        requestId: requestId(),
      };
      setCaptureSession(next);
      trace.action('dashboard-thumbnail:scheduled', {
        projectId,
        generation: next.generation,
        requestId: next.requestId,
        retry: retryCountRef.current,
      });
    }, CAPTURE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    captureSession,
    generation,
    mainBranchActive,
    needsInitialCapture,
    projectId,
    retryTick,
    saveStatus,
    suspended,
  ]);

  useLayoutEffect(() => {
    if (!captureSession) return;
    const session = captureSession;
    const iframe = iframeRef.current;
    const contentWindow = iframe?.contentWindow;
    if (!iframe || !contentWindow) return;

    let stopped = false;
    let readySeen = false;
    let captureRequested = false;
    let expectedPath: string | null = null;

    const retryOrFail = (reason: string, error?: unknown) => {
      if (stopped) return;
      stopped = true;
      uploadInFlightRef.current = false;
      const retry = retryCountRef.current < MAX_SESSION_RETRIES;
      if (retry) {
        retryCountRef.current += 1;
        lastFailedGenerationRef.current = -1;
      } else {
        lastFailedGenerationRef.current = session.generation;
      }
      setCaptureSession(null);
      trace.error('dashboard-thumbnail:capture-failed', {
        projectId,
        generation: session.generation,
        requestId: session.requestId,
        reason,
        retry,
        retryCount: retryCountRef.current,
        ...(error === undefined ? {} : { error: String(error) }),
      });
      if (retry) setRetryTick((value) => value + 1);
    };

    const timeout = setTimeout(() => retryOrFail('timeout'), CAPTURE_TIMEOUT_MS);

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
        trace.action('dashboard-thumbnail:iframe-ready', {
          projectId,
          requestId: session.requestId,
        });

        const page = chooseDashboardThumbnailPage(projectFS.listFiles('app/'));
        if (!page) {
          retryOrFail('no-page');
          return;
        }
        if (!projectFS.isMainActive()) {
          stopped = true;
          clearTimeout(timeout);
          setCaptureSession(null);
          return;
        }

        const payload = collectPreviewProjectPayload(activeLocale);
        expectedPath = dashboardThumbnailPageUrl(page);
        postPreviewProjectPayload(contentWindow, payload, '*');
        contentWindow.postMessage({ type: 'preview:component', filePath: null }, '*');
        contentWindow.postMessage({
          type: 'preview:variant-page',
          variantFilePath: null,
          basePagePath: null,
        }, '*');
        contentWindow.postMessage({ type: 'preview:navigate', url: expectedPath }, '*');
        trace.action('dashboard-thumbnail:project-pushed', {
          projectId,
          page,
          slug: filePathToSlug(page),
          route: expectedPath,
          fileCount: payload.files.length,
          requestId: session.requestId,
        });
        return;
      }

      if (message.type === 'preview:rendered' && expectedPath && !captureRequested) {
        const renderedPath = normalizePreviewPath(message.url);
        if (renderedPath !== expectedPath) return;
        captureRequested = true;
        trace.action('dashboard-thumbnail:first-page-rendered', {
          projectId,
          route: expectedPath,
          requestId: session.requestId,
        });
        contentWindow.postMessage({
          type: 'preview:capture-thumbnail',
          requestId: session.requestId,
        }, '*');
        trace.action('dashboard-thumbnail:capture-requested', {
          projectId,
          requestId: session.requestId,
        });
        return;
      }

      if (message.type !== 'preview:thumbnail' || uploadInFlightRef.current) return;
      if (message.requestId !== session.requestId) return;
      const dataUrl = message.dataUrl;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        retryOrFail('bad-payload');
        return;
      }

      trace.action('dashboard-thumbnail:raster-received', {
        projectId,
        requestId: session.requestId,
        chars: dataUrl.length,
      });
      uploadInFlightRef.current = true;
      void uploadFieldProjectThumbnail(projectId, dataUrl)
        .then((url) => {
          if (stopped) return;
          stopped = true;
          clearTimeout(timeout);
          clearInterval(probeTimer);
          uploadInFlightRef.current = false;
          retryCountRef.current = 0;
          lastSuccessfulGenerationRef.current = session.generation;
          lastFailedGenerationRef.current = -1;
          setNeedsInitialCapture(false);
          setCaptureSession(null);
          trace.action('dashboard-thumbnail:upload-success', {
            projectId,
            generation: session.generation,
            requestId: session.requestId,
            url,
            changedDuringCapture: generationRef.current !== session.generation,
          });
        })
        .catch((error) => retryOrFail('upload', error));
    };

    window.addEventListener('message', handler);
    return () => {
      stopped = true;
      clearTimeout(timeout);
      clearInterval(probeTimer);
      window.removeEventListener('message', handler);
    };
  }, [activeLocale, captureSession, projectId]);

  if (BACKEND_KIND !== 'field' || suspended || !captureSession) return null;

  return (
    <iframe
      key={captureSession.key}
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
        opacity: 0.001,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
