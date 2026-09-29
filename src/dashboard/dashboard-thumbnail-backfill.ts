// Repair older dashboard cards from their saved project snapshots. The editor's
// live capture host handles future edits; this path runs only for missing, stale,
// or pre-viewport-renderer thumbnails while the dashboard is open.

import type { FieldProjectMeta } from '@/backend/field-projects';
import { getFieldProjectThumbnailState, uploadFieldProjectThumbnail } from '@/backend/field-projects';
import { buildPreviewProjectPayloadFromFiles, postPreviewProjectPayload } from '@/preview/preview-project-payload';
import { chooseDashboardThumbnailPage, dashboardThumbnailPageUrl } from '@/preview/dashboard-thumbnail-page';

type PreviewMessage = Record<string, unknown>;

function previewOrigin(): string {
  return window.location.port
    ? `${window.location.protocol}//${window.location.hostname}:5175`
    : `${window.location.protocol}//preview.${window.location.hostname}`;
}

function projectFiles(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const files = (value as { files?: unknown }).files;
  if (!files || typeof files !== 'object' || Array.isArray(files)) return null;
  const entries = Object.entries(files);
  if (!entries.length || entries.some(([path, content]) => typeof path !== 'string' || typeof content !== 'string')) return null;
  return files as Record<string, string>;
}

async function loadSavedFiles(id: string, signal: AbortSignal, fetchImpl: typeof fetch): Promise<Record<string, string> | null> {
  const response = await fetchImpl(`/api/field/projects/${encodeURIComponent(id)}`, {
    method: 'GET', credentials: 'include', cache: 'no-store', signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Snapshot request failed: ${response.status}`);
  return projectFiles(await response.json());
}

class PreviewThumbnailRenderer {
  private readonly iframe: HTMLIFrameElement;
  private readonly origin = previewOrigin();
  private generation = 0;
  private readonly signal: AbortSignal;

  constructor(signal: AbortSignal) {
    this.signal = signal;
    this.iframe = document.createElement('iframe');
    this.iframe.setAttribute('aria-hidden', 'true');
    this.iframe.tabIndex = -1;
    this.iframe.title = '';
    this.iframe.style.cssText = 'position:fixed;left:0;top:0;width:1440px;height:900px;border:0;opacity:.001;pointer-events:none;z-index:-1';
  }

  private waitForMessage(
    accept: (message: PreviewMessage) => boolean,
    timeoutMs: number,
  ): Promise<PreviewMessage> {
    return new Promise((resolve, reject) => {
      if (this.signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        this.signal.removeEventListener('abort', onAbort);
      };
      const onAbort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
      const onMessage = (event: MessageEvent) => {
        if (event.origin !== this.origin || event.source !== this.iframe.contentWindow) return;
        const message = event.data as PreviewMessage;
        if (!message || typeof message !== 'object' || !accept(message)) return;
        cleanup();
        resolve(message);
      };
      const timer = setTimeout(() => { cleanup(); reject(new Error('Preview thumbnail timed out')); }, timeoutMs);
      window.addEventListener('message', onMessage);
      this.signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  async mount(): Promise<void> {
    const ready = this.waitForMessage(message => message.type === 'preview:ready', 12000);
    this.iframe.src = `${this.origin}/`;
    document.body.appendChild(this.iframe);
    const probe = setInterval(() => this.iframe.contentWindow?.postMessage({ type: 'preview:probe-ready' }, this.origin), 250);
    try { await ready; } finally { clearInterval(probe); }
  }

  async capture(files: Record<string, string>): Promise<string> {
    const page = chooseDashboardThumbnailPage(Object.keys(files));
    if (!page) throw new Error('Project has no page to capture');
    const frame = this.iframe.contentWindow;
    if (!frame) throw new Error('Preview frame unavailable');
    const generation = ++this.generation;
    const sessionId = crypto.randomUUID();
    const route = dashboardThumbnailPageUrl(page);
    const rendered = this.waitForMessage(message =>
      message.type === 'preview:rendered' &&
      message.requestId === sessionId &&
      message.generation === generation &&
      typeof message.url === 'string' &&
      new URL(message.url, this.origin).pathname === route,
    16000);
    frame.postMessage({ type: 'preview:thumbnail-session', requestId: sessionId }, this.origin);
    frame.postMessage({ type: 'preview:thumbnail-generation', generation }, this.origin);
    postPreviewProjectPayload(frame, buildPreviewProjectPayloadFromFiles(files, 'en', 'light'), this.origin);
    frame.postMessage({ type: 'preview:component', filePath: null }, this.origin);
    frame.postMessage({ type: 'preview:variant-page', variantFilePath: null, basePagePath: null }, this.origin);
    frame.postMessage({ type: 'preview:navigate', url: route }, this.origin);
    await rendered;

    const requestId = crypto.randomUUID();
    const captured = this.waitForMessage(message =>
      (message.type === 'preview:thumbnail' || message.type === 'preview:thumbnail-error') &&
      message.requestId === requestId,
    15000);
    frame.postMessage({ type: 'preview:capture-thumbnail', requestId }, this.origin);
    const result = await captured;
    if (result.type === 'preview:thumbnail-error') throw new Error(String(result.error ?? 'Preview capture failed'));
    if (typeof result.dataUrl !== 'string' || !result.dataUrl.startsWith('data:image/')) {
      throw new Error('Preview returned an invalid thumbnail');
    }
    return result.dataUrl;
  }

  dispose(): void { this.iframe.remove(); }
}

export async function backfillDashboardThumbnails(
  projects: FieldProjectMeta[],
  onReady: (projectId: string, url: string) => void,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
  force = false,
): Promise<void> {
  let renderer: PreviewThumbnailRenderer | null = null;
  try {
    for (const project of projects) {
      if (signal.aborted) break;
      if (project.trashedAt) continue;
      try {
        if (!force) {
          const state = await getFieldProjectThumbnailState(project.id, fetchImpl);
          if (!state.stale) continue;
        }
        const files = await loadSavedFiles(project.id, signal, fetchImpl);
        if (!files || !chooseDashboardThumbnailPage(Object.keys(files))) continue;
        let repaired = false;
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 2 && !signal.aborted; attempt += 1) {
          try {
            if (!renderer) {
              renderer = new PreviewThumbnailRenderer(signal);
              await renderer.mount();
            }
            const dataUrl = await renderer.capture(files);
            if (signal.aborted) break;
            const url = await uploadFieldProjectThumbnail(project.id, dataUrl, fetchImpl);
            if (!signal.aborted) onReady(project.id, url);
            repaired = true;
            break;
          } catch (error) {
            lastError = error;
            renderer?.dispose();
            renderer = null;
          }
        }
        if (!repaired && lastError) throw lastError;
      } catch (error) {
        if (signal.aborted) break;
        console.warn('[field-dashboard] thumbnail repair failed', project.id, error);
        renderer?.dispose();
        renderer = null;
      }
    }
  } finally {
    renderer?.dispose();
  }
}
