// usePreviewThumbnail.ts — visible-Preview thumbnail capture orchestration.
//
// The Preview iframe is runtime truth. When the user happens to open Preview on
// the same first Page represented by the dashboard card, reuse that already-live
// render as an opportunistic refresh. field-hosted projects upload to the
// field-native R2 thumbnail route; Revyme Cloud keeps its existing website
// preview-image endpoint. Missing/stale thumbnails remain cosmetic and never
// block Preview.

import { useEffect, useRef } from 'react';
import { BACKEND_KIND } from '@/backend';
import { uploadFieldProjectThumbnail } from '@/backend/field-projects';
import { getProjectId } from '@/backend/project-id';
import { uploadPreviewThumbnail } from '@/backend/revyme-backend';
import { trace } from '@/shared/debug-trace';

export function shouldCaptureThumbnail(args: {
  isThumbnailPage: boolean;
  lastCapturedVersion: number | null;
  currentVersion: number;
}): boolean {
  if (!args.isThumbnailPage) return false;
  return args.lastCapturedVersion !== args.currentVersion;
}

interface Options {
  open: boolean;
  iframeReady: boolean;
  /** True only for the Page chosen by dashboard-thumbnail-page.ts. */
  isThumbnailPage: boolean;
  projectVersion: number;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  postMessageTarget: string;
}

export function usePreviewThumbnail({
  open,
  iframeReady,
  isThumbnailPage,
  projectVersion,
  iframeRef,
  postMessageTarget,
}: Options): void {
  const lastCapturedVersionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow || event.source !== iframe.contentWindow) return;
      if (event.data?.type !== 'preview:thumbnail') return;
      const dataUrl = event.data.dataUrl;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        trace.error('preview-thumbnail:bad-payload', { kind: typeof dataUrl });
        return;
      }
      const projectId = getProjectId();
      if (!projectId) {
        trace.error('preview-thumbnail:no-project-id', {});
        return;
      }

      trace.action('preview-thumbnail:received', {
        projectId,
        backend: BACKEND_KIND,
        chars: dataUrl.length,
      });

      const upload = BACKEND_KIND === 'field'
        ? uploadFieldProjectThumbnail(projectId, dataUrl)
        : BACKEND_KIND === 'revyme'
          ? uploadPreviewThumbnail(projectId, dataUrl)
          : null;
      if (!upload) return;

      upload
        .then((url) => trace.action('preview-thumbnail:uploaded', {
          projectId,
          backend: BACKEND_KIND,
          url,
        }))
        .catch((error) => trace.error('preview-thumbnail:upload-failed', {
          projectId,
          backend: BACKEND_KIND,
          error: String(error),
        }));
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [iframeRef, open]);

  useEffect(() => {
    if (!open || !iframeReady) return;
    if (!shouldCaptureThumbnail({
      isThumbnailPage,
      lastCapturedVersion: lastCapturedVersionRef.current,
      currentVersion: projectVersion,
    })) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    lastCapturedVersionRef.current = projectVersion;
    iframe.contentWindow.postMessage({ type: 'preview:capture-thumbnail' }, postMessageTarget);
    trace.action('preview-thumbnail:requested', { projectVersion });
    // Do not re-capture on every edit while Preview stays open. A close/reopen,
    // or the background capture host after save, handles the next refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, iframeReady, isThumbnailPage]);
}
