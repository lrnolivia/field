// ProjectThumbnailCaptureHost.tsx — invisible, best-effort dashboard thumbnail refresh.
//
// This deliberately uses the REAL Preview sandbox. It never renders a fake JSX
// miniature and never places a live iframe on the dashboard. When field's saved
// main-branch snapshot needs a thumbnail, we briefly boot Preview offscreen,
// send the canonical Preview payload, navigate to the first Page, ask the
// existing capture-thumbnail runtime to rasterize it, upload the image to R2,
// then tear the iframe back down.

import { useEffect, useRef, useState } from 'react';
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
const CAPTURE_TIMEOUT_MS = 20000;
const CHANGE_PULSE_MS = 250;

function previewOrigin(): string {
  if (typeof window === 'undefined') return 'http://localhost:5175';
  return window.location.port
    ? `${window.location.protocol}//${window.location.hostname}:5175`
    : `${window.location.protocol}//preview.${window.location.hostname}`;
}

interface Props {
  /** Visible Preview owns the Preview runtime while open; hidden capture yields. */
  suspended: boolean;
}

interface CaptureSession {
  key: number;
  generation: number;
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
  const [generation, setGeneration] = useState(0);
  const [mainBranchActive, setMainBranchActive] = useState(() => projectFS.isMainActive());
  const [needsInitialCapture, setNeedsInitialCapture] = useState<boolean | null>(null);
  const [captureSession, setCaptureSession] = useState<CaptureSession | null>(null);

  // Coalesce ProjectFS churn. The ref increments for every coarse project pulse;
  // React only needs a quiet-ish notification to schedule the eventual capture.
  useEffect(() => {
    let pulse: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = projectFS.subscribe(() => {
      generationRef.current += 1;
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

  // On editor entry — and again after visible Preview closes — compare the
  // cached R2 image timestamp with the project's real saved updatedAt. This
  // backfills old projects and repairs a stale thumbnail left by a very fast
  // edit→dashboard exit without recapturing every project on every open.
  useEffect(() => {
    if (BACKEND_KIND !== 'field' || suspended) return;
    let cancelled = false;
    setNeedsInitialCapture(null);
    void getFieldProjectThumbnailState(projectId)
      .then((state) => {
        if (cancelled) return;
        setNeedsInitialCapture(!state.exists || state.stale);
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
        // A failed HEAD should not start an expensive capture that will likely
        // fail to upload for the same connectivity reason. A later project
        // mutation or a future editor entry gives us another chance.
        setNeedsInitialCapture(false);
        trace.error('dashboard-thumbnail:freshness-failed', { projectId, error: String(error) });
      });
    return () => { cancelled = true; };
  }, [projectId, suspended]);

  // Visible Preview takes precedence. Aborting here is not a failed generation:
  // once Preview closes the freshness HEAD above decides whether work remains.
  useEffect(() => {
    if (suspended && captureSession) {
      uploadInFlightRef.current = false;
      setCaptureSession(null);
    }
  }, [captureSession, suspended]);

  useEffect(() => {
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
      // Re-check the branch at execution time; it can switch while the delay is
      // pending and projectFS is the actual authority.
      if (!projectFS.isMainActive()) return;
      const next: CaptureSession = {
        key: ++sessionSerialRef.current,
        generation: generationRef.current,
      };
      setCaptureSession(next);
      trace.action('dashboard-thumbnail:capture-start', {
        projectId,
        generation: next.generation,
      });
    }, CAPTURE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    captureSession,
    generation,
    mainBranchActive,
    needsInitialCapture,
    projectId,
    saveStatus,
    suspended,
  ]);

  useEffect(() => {
    if (!captureSession) return;
    const session = captureSession;
    const iframe = iframeRef.current;
    const contentWindow = iframe?.contentWindow;
    if (!iframe || !contentWindow) return;

    let captureRequested = false;
    let stopped = false;

    const failSession = (reason: string, error?: unknown) => {
      if (stopped) return;
      stopped = true;
      uploadInFlightRef.current = false;
      lastFailedGenerationRef.current = session.generation;
      setCaptureSession(null);
      trace.error('dashboard-thumbnail:capture-failed', {
        projectId,
        generation: session.generation,
        reason,
        ...(error === undefined ? {} : { error: String(error) }),
      });
    };

    const timeout = setTimeout(() => failSession('timeout'), CAPTURE_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.source !== contentWindow) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      if (message.type === 'preview:ready' && !captureRequested) {
        const page = chooseDashboardThumbnailPage(projectFS.listFiles('app/'));
        if (!page) {
          failSession('no-page');
          return;
        }
        if (!projectFS.isMainActive()) {
          // Branch switched after session creation. Yield rather than snapshot
          // unmerged branch work into the project's canonical dashboard card.
          stopped = true;
          clearTimeout(timeout);
          setCaptureSession(null);
          return;
        }

        const payload = collectPreviewProjectPayload(activeLocale);
        postPreviewProjectPayload(contentWindow, payload, '*');
        contentWindow.postMessage({ type: 'preview:component', filePath: null }, '*');
        contentWindow.postMessage({
          type: 'preview:variant-page',
          variantFilePath: null,
          basePagePath: null,
        }, '*');
        const url = dashboardThumbnailPageUrl(page);
        contentWindow.postMessage({ type: 'preview:navigate', url }, '*');
        contentWindow.postMessage({ type: 'preview:capture-thumbnail' }, '*');
        captureRequested = true;
        trace.action('dashboard-thumbnail:capture-requested', {
          projectId,
          page,
          slug: filePathToSlug(page),
          fileCount: payload.files.length,
        });
        return;
      }

      if (message.type !== 'preview:thumbnail' || uploadInFlightRef.current) return;
      const dataUrl = message.dataUrl;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        failSession('bad-payload');
        return;
      }

      uploadInFlightRef.current = true;
      void uploadFieldProjectThumbnail(projectId, dataUrl)
        .then((url) => {
          if (stopped) return;
          stopped = true;
          clearTimeout(timeout);
          uploadInFlightRef.current = false;
          lastSuccessfulGenerationRef.current = session.generation;
          lastFailedGenerationRef.current = -1;
          setNeedsInitialCapture(false);
          setCaptureSession(null);
          trace.action('dashboard-thumbnail:capture-complete', {
            projectId,
            generation: session.generation,
            url,
            changedDuringCapture: generationRef.current !== session.generation,
          });
        })
        .catch((error) => failSession('upload', error));
    };

    window.addEventListener('message', handler);
    return () => {
      stopped = true;
      clearTimeout(timeout);
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
        left: '-200vw',
        top: 0,
        width: 1440,
        height: 900,
        border: 0,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
