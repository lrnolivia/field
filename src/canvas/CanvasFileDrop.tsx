// CanvasFileDrop.tsx — Canvas-wide file/image-drop handler.
//
// Listens on the editor window for drops and routes two external-drag
// shapes (internal canvas/layer/media drags carry neither, so they're
// naturally ignored):
//
//   1. OS file drops (`DataTransfer.files`):
//        - All SVG: open "New Vector Set" modal → build an icon-set
//          master and drop an instance at the drop position.
//        - Images (PNG/JPG/WebP/GIF/…): ingest through the active backend via
//          `backend.uploadAsset` and drop each as a frame.
//   2. Browser image-URL drops (`text/uri-list` / `DownloadURL` /
//      `text/html` <img>): dragging an image out of another tab, off a
//      web page, or from Chrome's download history. The image is
//      re-ingested through the active Media backend (server-side bytes are fetched client-side and
//      re-uploaded through the SAME `/api/upload` route the Media tab
//      uses) and dropped. If the source blocks CORS so the bytes can't
//      be read, we fall back to the original remote URL so the drop
//      still lands.
//
// Dropped images become a FRAME (div) with a `background-image` fill —
// sized to the image's aspect ratio — not an `<img>` node.

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { activeFilePathAtom } from '@/code/project/active-file-store';
import { selectedIdsAtom } from '@/code/stores/store';
import { queueMutation, flushNow } from '@/code/mutation/mutation-queue';
import { generateNodeId } from '@/shared/id-utils';
import { transformManager } from '@/canvas/transform';
import { screenToCanvas } from '@/canvas/canvas-math';
import { getContentRoot, getContentRootRect } from '@/canvas/node-ops';
import { backend } from '@/backend';
import { getProjectId } from '@/backend/project-id';
import { createVectorSetFromSvgs, preflightSvgFiles, type PreflightSvg } from '@/code/icons/create-vector-set-from-svgs';
import { isViewerMode } from '@/code/stores/viewer-mode-store';
import { addImportIfNeeded } from '@/code/icons/icon-set-ops';
import { modifyProjectFile } from '@/code/project/modify-file';
import NameInputModal from '@/editor/ui/NameInputModal';
import { getImageDimensions, fitFrameBox } from '@/canvas/image-dims';
import { trace } from '@/shared/debug-trace';
import { upsertMediaUploadAtom, upsertSessionMediaAssetAtom } from '@/editor/media/media-state';
import { ingestMediaFile, type MediaQueueWriter } from '@/editor/media/media-ingest';

/** Classification of a file by its mime/extension. */
type FileKind = 'svg' | 'image' | 'unknown';

function classifyFile(file: File): FileKind {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (type === 'image/svg+xml' || name.endsWith('.svg')) return 'svg';
  if (type.startsWith('image/')) return 'image';
  // Some browsers report SVG with empty type — fall through to extension.
  if (name.match(/\.(png|jpe?g|gif|webp|avif|bmp)$/)) return 'image';
  return 'unknown';
}

/** True for the external drag shapes we handle. Internal drags (toolbar,
 *  layers, media tiles) use a custom non-HTML5 drag with none of these
 *  types, so they fall through. `text/uri-list` covers images dragged
 *  off a page / another tab / Chrome download history; `DownloadURL` is
 *  Chrome's file drag-out. We can only see TYPES (not data) on dragover,
 *  so link/text drags also pass here — the drop handler then no-ops if
 *  the payload isn't actually an image. */
export function isExternalImageDrag(types: readonly string[]): boolean {
  return types.includes('Files') || types.includes('text/uri-list') || types.includes('DownloadURL');
}

export function isPointInsideCanvasRect(
  x: number,
  y: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>,
): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function canvasMediaDropLabel(imageCount: number, svgCount: number): string {
  if (imageCount > 0 && svgCount === 0) {
    return imageCount === 1 ? 'Place image' : 'Place ' + imageCount + ' images';
  }
  if (svgCount > 0 && imageCount === 0) {
    return svgCount === 1 ? 'Create vector set' : 'Create vector set · ' + svgCount + ' SVGs';
  }
  if (imageCount > 0 || svgCount > 0) return 'Add media';
  return 'Place media';
}

function dragFeedbackLabel(dt: DataTransfer): string {
  const files = Array.from(dt.files ?? []);
  if (files.length === 0 && (Array.from(dt.types).includes('text/uri-list') || Array.from(dt.types).includes('DownloadURL'))) {
    return 'Place image';
  }
  let imageCount = 0;
  let svgCount = 0;
  for (const file of files) {
    const kind = classifyFile(file);
    if (kind === 'image') imageCount += 1;
    else if (kind === 'svg') svgCount += 1;
  }
  return canvasMediaDropLabel(imageCount, svgCount);
}

interface CanvasMediaDropFeedback {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
}

/** Don't hijack drops aimed at a real text field (URL inputs, code
 *  editor, etc.) — let the field accept the dropped text/URL. */
function isFormFieldTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('input, textarea, [contenteditable="true"], [contenteditable=""], .monaco-editor');
}

/** Convert a screen (clientX/Y) point to canvas-space coords — the system
 *  inline styles like `left: 100px` use. Goes through the SAME
 *  `screenToCanvas(transform, containerRect)` path the creators
 *  (FrameCreator etc.) use, so the drop lands exactly under the cursor:
 *  it subtracts the canvas container's on-screen offset (past the left
 *  sidebar + top header), the pan (`transform.x/y`), and divides by zoom
 *  (`transform.scale`). The container is the content root's parent in the
 *  PARENT document (the static viewport area; the content root itself
 *  carries the pan/zoom transform). */
function dropPointToCanvas(clientX: number, clientY: number): { x: number; y: number } {
  const t = transformManager.getTransform();
  const containerEl = getContentRoot()?.parentElement ?? null;
  const containerRect = containerEl?.getBoundingClientRect();
  if (!containerRect) {
    // No container yet (canvas not mounted) — best-effort with pan/zoom only.
    return { x: Math.round((clientX - t.x) / (t.scale || 1)), y: Math.round((clientY - t.y) / (t.scale || 1)) };
  }
  const p = screenToCanvas(clientX, clientY, t, containerRect);
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

/** Pull an image URL out of a drop's DataTransfer. Only call inside the
 *  `drop` handler — `getData` returns '' during dragover for security. */
export function extractImageUrlFromDataTransfer(dt: DataTransfer): { url: string; name?: string } | null {
  // 1. DownloadURL — "<mime>:<filename>:<url>" (Chrome file drag-out).
  const dl = dt.getData('DownloadURL');
  if (dl) {
    const i1 = dl.indexOf(':');
    const i2 = dl.indexOf(':', i1 + 1);
    if (i1 > 0 && i2 > i1) {
      const mime = dl.slice(0, i1);
      const name = dl.slice(i1 + 1, i2);
      const url = dl.slice(i2 + 1);
      if (mime.startsWith('image/') && url) return { url, name: name || undefined };
    }
  }
  // 2. text/html — first <img src> (dragging an image element off a page).
  const html = dt.getData('text/html');
  if (html) {
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m?.[1]) return { url: m[1] };
  }
  // 3. text/uri-list — first non-comment line.
  const uriList = dt.getData('text/uri-list');
  if (uriList) {
    const line = uriList.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
    if (line) return { url: line };
  }
  // 4. text/plain / URL — a bare http(s)/data/blob URL.
  const plain = (dt.getData('URL') || dt.getData('text/plain') || '').trim();
  if (/^(https?:|data:image\/|blob:)/i.test(plain)) return { url: plain };
  return null;
}

/** Derive a filename from a URL for the upload (Media library naming). */
export function filenameFromUrl(url: string): string | null {
  try {
    if (url.startsWith('data:')) return null;
    const u = new URL(url, window.location.href);
    const last = u.pathname.split('/').pop();
    return last && /\.\w+$/.test(last) ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

/** Fetch a URL's bytes client-side and re-ingest through the active backend via the shared
 *  asset route. Returns the backend URL, or null when the bytes can't be read
 *  (CORS) or aren't an image — caller falls back to the original URL. */
async function rehostImageThroughBackend(url: string, projectId: string, name?: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = blob.type || '';
    // Trust an image content-type, or an image-looking filename/extension
    // (download-history items sometimes serve a generic octet-stream).
    const fileName = name || filenameFromUrl(url) || 'image.png';
    const looksImage = type.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(fileName);
    if (!looksImage) return null;
    const file = new File([blob], fileName, { type: type || 'image/png' });
    const hostedUrl = await backend.uploadAsset(projectId, file);
    trace.action('canvas-file-drop:rehost-success', { from: url.slice(0, 80), hostedUrl });
    return hostedUrl;
  } catch (err) {
    trace.action('canvas-file-drop:rehost-failed', { url: url.slice(0, 80), error: String(err) });
    return null;
  }
}

/** Queue a frame (div) with a background-image fill CENTERED on the given
 *  canvas point, sized to `dims` (or a default box). `canvasX/Y` is the
 *  drop point under the cursor; left/top are offset by half the box so
 *  the image appears centered where the mouse released. Returns the new
 *  node id. Does NOT flush — caller batches flush + selection. */
function queueImageFrame(displayUrl: string, dims: { w: number; h: number } | null, canvasX: number, canvasY: number): string {
  const { width, height } = fitFrameBox(dims);
  const id = generateNodeId('frame');
  queueMutation({
    type: 'addCanvasNode',
    node: {
      id,
      type: 'div',
      name: 'Image',
      attrs: {},
      styles: {
        position: 'absolute',
        left: `${Math.round(canvasX - width / 2)}px`,
        top: `${Math.round(canvasY - height / 2)}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundImage: `url(${displayUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      },
    },
  });
  return id;
}

interface PendingDrop {
  /** Preflighted (read + content-sniffed + capped) SVG entries. */
  validSvgs: PreflightSvg[];
  /** Files rejected by preflight, with human-readable reasons. */
  skipped: { name: string; reason: string }[];
  imageFiles: File[];
  /** Canvas-space coords where the user dropped. */
  canvasX: number;
  canvasY: number;
}

export default function CanvasFileDrop() {
  const activeFilePath = useAtomValue(activeFilePathAtom);
  const setSelectedIds = useSetAtom(selectedIdsAtom);
  const upsertMediaUpload = useSetAtom(upsertMediaUploadAtom);
  const rememberMediaAsset = useSetAtom(upsertSessionMediaAssetAtom);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [dropFeedback, setDropFeedback] = useState<CanvasMediaDropFeedback | null>(null);

  // External Media drags are valid only over the actual canvas viewport.
  // Editor chrome still prevents browser navigation, but does not become an
  // accidental canvas insertion target.
  const handleDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer || isFormFieldTarget(e.target)) return;
    if (!isExternalImageDrag(Array.from(e.dataTransfer.types))) return;
    e.preventDefault();
    if (isViewerMode()) {
      setDropFeedback(null);
      return;
    }

    const rect = getContentRootRect();
    if (!rect || !isPointInsideCanvasRect(e.clientX, e.clientY, rect)) {
      setDropFeedback(null);
      return;
    }

    e.dataTransfer.dropEffect = 'copy';
    const next: CanvasMediaDropFeedback = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      label: dragFeedbackLabel(e.dataTransfer),
    };
    setDropFeedback((current) => (
      current
      && current.left === next.left
      && current.top === next.top
      && current.width === next.width
      && current.height === next.height
      && current.label === next.label
        ? current
        : next
    ));
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    if (!e.dataTransfer || isFormFieldTarget(e.target)) return;
    if (!isExternalImageDrag(Array.from(e.dataTransfer.types))) return;
    e.preventDefault();
    setDropFeedback(null);

    const rect = getContentRootRect();
    if (!rect || !isPointInsideCanvasRect(e.clientX, e.clientY, rect)) {
      trace.action('canvas-file-drop:ignored-outside-canvas', {
        clientX: e.clientX,
        clientY: e.clientY,
      });
      return;
    }

    if (isViewerMode()) return;

    // Canvas-space drop position — exactly under the cursor, accounting
    // for the container offset (sidebar/header), pan, and zoom.
    const { x: canvasX, y: canvasY } = dropPointToCanvas(e.clientX, e.clientY);

    const fileList = e.dataTransfer.files;
    if (fileList && fileList.length > 0) {
      const files = Array.from(fileList);
      const svgFiles: File[] = [];
      const imageFiles: File[] = [];
      for (const f of files) {
        const kind = classifyFile(f);
        if (kind === 'svg') svgFiles.push(f);
        else if (kind === 'image') imageFiles.push(f);
      }

      if (svgFiles.length === 0 && imageFiles.length === 0) {
        trace.action('canvas-file-drop:no-supported-files', { count: files.length });
        return;
      }

      trace.action('canvas-file-drop:file-drop', {
        svgCount: svgFiles.length, imageCount: imageFiles.length, canvasX, canvasY,
      });

      if (svgFiles.length > 0) {
        // Preflight BEFORE the modal so the dialog shows honest counts
        // (mislabeled/oversized/unreadable files are skipped with reasons).
        const pre = await preflightSvgFiles(svgFiles);
        if (pre.valid.length === 0) {
          // every "SVG" was junk — say so, and still honor any images
          toast.error(`No valid SVG files in the drop (${pre.skipped.length} skipped).`);
          if (imageFiles.length > 0) await handleImageFileDrops(imageFiles, canvasX, canvasY, setSelectedIds, upsertMediaUpload, rememberMediaAsset);
          return;
        }
        setPendingDrop({ validSvgs: pre.valid, skipped: pre.skipped, imageFiles, canvasX, canvasY });
        return;
      }
      await handleImageFileDrops(imageFiles, canvasX, canvasY, setSelectedIds, upsertMediaUpload, rememberMediaAsset);
      return;
    }

    // No files — a browser image-URL drag (page image, another tab,
    // download history). Extract the URL and re-host it through R2.
    const extracted = extractImageUrlFromDataTransfer(e.dataTransfer);
    if (!extracted) {
      trace.action('canvas-file-drop:no-image-url', { types: Array.from(e.dataTransfer.types) });
      return;
    }
    trace.action('canvas-file-drop:url-drop', { url: extracted.url.slice(0, 120), canvasX, canvasY });
    await handleImageUrlDrop(extracted.url, extracted.name, canvasX, canvasY, setSelectedIds);
  }, [setSelectedIds, upsertMediaUpload, rememberMediaAsset]);

  // Window-level listeners suppress browser navigation for external Media,
  // while the canvas rect itself remains the only valid insertion target.
  useEffect(() => {
    const onOver = (e: DragEvent) => handleDragOver(e);
    const onDrop = (e: DragEvent) => { void handleDrop(e); };
    const clearFeedback = () => setDropFeedback(null);
    const onLeave = (e: DragEvent) => {
      const rect = getContentRootRect();
      if (!rect || !isPointInsideCanvasRect(e.clientX, e.clientY, rect)) clearFeedback();
    };

    window.addEventListener('dragenter', onOver);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragend', clearFeedback);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onOver);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragend', clearFeedback);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleDragOver, handleDrop]);

  // Modal submission: actually create the vector-set + drop instance.
  const handleVectorSetSubmit = useCallback(async (name: string) => {
    if (!pendingDrop) return;
    const { validSvgs, imageFiles, canvasX, canvasY } = pendingDrop;
    setPendingDrop(null);

    const result = await createVectorSetFromSvgs(name || 'Icon Set', validSvgs);
    if (!result) {
      trace.error('canvas-file-drop:vector-set-failed', { fileCount: validSvgs.length });
      toast.error('Could not create the vector set.');
      return;
    }

    // Drop an instance of the new icon-set onto the current page at the
    // drop position. The instance points to the FIRST icon by default
    // (matches the manual "Make Icon Set" flow).
    const instanceId = generateNodeId('SeCeJo'); // namespaced id with iconset prefix
    const styles = {
      position: 'absolute',
      width: '240px',
      height: '240px',
      left: `${canvasX}px`,
      top: `${canvasY}px`,
    } as Record<string, string>;
    queueMutation({
      type: 'addCanvasNode',
      node: {
        id: instanceId,
        type: result.iconSetName,
        name: result.iconSetName,
        attrs: { name: 'icon-1' },
        styles,
      },
    });
    flushNow();

    // Add the import for the new icon-set component to the active page.
    modifyProjectFile(activeFilePath, (code) => addImportIfNeeded(code, result.iconSetName, result.iconSetFilePath));

    setSelectedIds([instanceId]);
    trace.action('canvas-file-drop:vector-set-instance-dropped', {
      instanceId, iconSetName: result.iconSetName, iconCount: result.iconCount,
    });

    // Also drop any images that came alongside the SVGs.
    if (imageFiles.length > 0) {
      await handleImageFileDrops(imageFiles, canvasX + 280, canvasY, setSelectedIds, upsertMediaUpload, rememberMediaAsset);
    }
  }, [pendingDrop, activeFilePath, setSelectedIds, upsertMediaUpload, rememberMediaAsset]);

  // Cancelling the set must NOT swallow images dropped alongside the
  // SVGs — the user dropped them; insert them anyway.
  const handleVectorSetCancel = useCallback(() => {
    const stash = pendingDrop;
    setPendingDrop(null);
    if (stash && stash.imageFiles.length > 0) {
      void handleImageFileDrops(stash.imageFiles, stash.canvasX, stash.canvasY, setSelectedIds, upsertMediaUpload, rememberMediaAsset);
    }
  }, [pendingDrop, setSelectedIds, upsertMediaUpload, rememberMediaAsset]);

  // Honest dialog copy: what will be created, what rode along, what was skipped.
  const dropSummary = pendingDrop
    ? [
        `${pendingDrop.validSvgs.length} icon${pendingDrop.validSvgs.length === 1 ? '' : 's'} ready`,
        pendingDrop.imageFiles.length > 0
          ? `${pendingDrop.imageFiles.length} image${pendingDrop.imageFiles.length === 1 ? '' : 's'} will be added separately`
          : null,
        pendingDrop.skipped.length > 0
          ? `${pendingDrop.skipped.length} skipped (${pendingDrop.skipped[0].reason}${pendingDrop.skipped.length > 1 ? ', …' : ''})`
          : null,
      ].filter(Boolean).join(' · ')
    : undefined;

  return (
    <>
      {dropFeedback && createPortal(
        <div
          data-canvas-media-drop-target
          className="pointer-events-none fixed z-[14980] border"
          style={{
            left: dropFeedback.left,
            top: dropFeedback.top,
            width: dropFeedback.width,
            height: dropFeedback.height,
            borderColor: 'var(--accent)',
            background: 'color-mix(in srgb, var(--accent) 5%, transparent)',
          }}
          aria-hidden
        >
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-2 py-1 text-[10px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)]">
            {dropFeedback.label}
          </div>
        </div>,
        document.body,
      )}
      <NameInputModal
        isOpen={!!pendingDrop && pendingDrop.validSvgs.length > 0}
        onClose={handleVectorSetCancel}
        onSubmit={handleVectorSetSubmit}
        title="New Vector Set"
        description={dropSummary}
        placeholder="Icon Set"
        defaultValue="Icon Set"
        submitLabel="Create"
      />
    </>
  );
}

/** Upload + drop image FILES (OS drag). Each becomes a frame with a
 *  background-image fill, sized to its natural aspect ratio, offset
 *  horizontally so siblings don't stack. Selects the last one. */
async function handleImageFileDrops(
  imageFiles: File[],
  canvasX: number,
  canvasY: number,
  setSelectedIds: (ids: string[]) => void,
  upsertMediaUpload: MediaQueueWriter,
  rememberMediaAsset: (asset: import('@/editor/media/media-system').MediaAsset) => void,
): Promise<void> {
  const projectId = getProjectId();
  let xOffset = 0;
  let lastId: string | null = null;
  for (const file of imageFiles) {
    // Read natural dimensions before ingest so placement preserves aspect ratio.
    const objectUrl = URL.createObjectURL(file);
    const dims = await getImageDimensions(objectUrl);
    URL.revokeObjectURL(objectUrl);

    try {
      trace.action('canvas-file-drop:image-upload-start', { name: file.name, size: file.size });
      const result = await ingestMediaFile({
        file,
        projectId,
        kind: 'image',
        upsert: upsertMediaUpload,
        idPrefix: 'canvas',
        rememberAsset: rememberMediaAsset,
      });
      const { width } = fitFrameBox(dims);
      lastId = queueImageFrame(result.url, dims, canvasX + xOffset, canvasY);
      trace.action('canvas-file-drop:image-dropped', {
        id: lastId,
        url: result.url,
        reusedExisting: result.reusedExisting,
      });
      xOffset += width + 20;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      trace.error('canvas-file-drop:image-upload-failed', {
        name: file.name,
        error: message,
      });
      toast.error(err instanceof Error ? err.message : 'Image upload failed');
    }
  }
  if (lastId) {
    flushNow();
    setSelectedIds([lastId]);
  }
}

/** Re-host a browser image URL through the active backend and drop it as a frame. Falls back
 *  to the original URL when the bytes can't be fetched (CORS), so the drop
 *  still lands; aborts only if the URL can't render as an image at all. */
async function handleImageUrlDrop(
  url: string,
  name: string | undefined,
  canvasX: number,
  canvasY: number,
  setSelectedIds: (ids: string[]) => void,
): Promise<void> {
  const projectId = getProjectId();
  const hostedUrl = await rehostImageThroughBackend(url, projectId, name);
  const displayUrl = hostedUrl ?? url;

  // Confirm it actually renders before inserting an empty frame.
  const dims = await getImageDimensions(displayUrl);
  if (!dims && !hostedUrl) {
    trace.action('canvas-file-drop:url-not-image', { url: url.slice(0, 120) });
    toast.error('Could not load the dropped image');
    return;
  }
  if (!hostedUrl) {
    // CORS-blocked re-host — using the remote URL directly (not in durable Media storage).
    trace.action('canvas-file-drop:url-rehost-fallback', { url: url.slice(0, 120) });
  }

  const id = queueImageFrame(displayUrl, dims, canvasX, canvasY);
  flushNow();
  setSelectedIds([id]);
  trace.action('canvas-file-drop:url-dropped', { id, rehosted: !!hostedUrl });
}
