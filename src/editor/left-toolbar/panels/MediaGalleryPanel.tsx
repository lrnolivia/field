// MediaGalleryPanel.tsx — canonical project Media browser.
// Durable inventory comes from the active backend when supported; otherwise
// uploaded source/runtime URLs remain session-local without faking durability.
//
// Drop into canvas: tiles use the same toolbar-drag pipeline the Library
// and Insert panels use (`startToolbarDrag` + 5 px movement threshold +
// drop-line indicator + parent-highlight). No HTML5 dataTransfer + no
// click-to-copy-URL — that older flow was inconsistent with the rest
// of the editor (no drop preview, no parent insertion semantics).
//
// Deleting: hovering a tile reveals an × (top-right). Click → ConfirmModal →
// DELETE /api/upload. Shift+click multi-selects tiles; shift+DRAG sweeps a
// marquee over the grid (auto-scrolling at the edges) — the × on any
// selected tile then bulk-deletes the whole selection. Cloud-only (the
// standalone object URLs have no server object to delete).

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { ToolSegmentedControl } from '@/editor/controls';
import { trace } from '@/shared/debug-trace';
import SectionLabel from '@/design-system/SectionLabel';
import SearchBar from '@/design-system/SearchBar';
import { backend } from '@/backend';
import { getProjectId } from '@/backend/project-id';
import { startToolbarDrag } from '@/canvas/drag/toolbar-drag-bridge';
import { type ToolbarItem } from '@/canvas/drag/toolbar-item-config';
import { ConfirmModal } from '@/editor/overlays/settings-shared';
import { MULTI_SELECT_OUTLINE } from './LibraryPanel/shared/section-utils';
import { deriveUploadKey, keysInSweep, sweepAutoScrollStep, deleteConfirmMessage, type TileRect } from './media-gallery-utils';
import { buildGalleryMediaToolbarItem, selectedGalleryMediaUrls } from '@/editor/gallery/gallery-media-drag';
import { upsertMediaUploadAtom } from '@/editor/media/media-state';
import { ingestMediaFile } from '@/editor/media/media-ingest';

type MediaGalleryTab = 'all' | 'images' | 'videos';

const TAB_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
];

interface UploadedFile {
  url: string;
  kind: 'image' | 'video';
  key?: string;
  size?: number;
  lastModified?: string;
}

/** 5 px movement threshold before a tile pointerdown is treated as a drag.
 *  Below this, releasing the pointer is a no-op (no click action — the
 *  panel is drag-only). At/above, the toolbar drag pipeline kicks in.
 *  Same value LibraryPanel uses (`LIBRARY_DRAG_THRESHOLD_PX`). */
const MEDIA_DRAG_THRESHOLD_PX = 5;

const mediaImageRatioCache = new Map<string, number>();

function rememberMediaImageRatio(url: string, image: HTMLImageElement): void {
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
  mediaImageRatioCache.set(url, image.naturalWidth / image.naturalHeight);
}

/** Shared drag logic for media tiles. Mirrors LibraryPanel's
 *  `useComponentDrag` exactly — kicks off `startToolbarDrag` once the
 *  cursor moves more than `MEDIA_DRAG_THRESHOLD_PX` from the
 *  pointerdown position, with a `ToolbarItem` describing the image /
 *  video to drop. Drop targeting (drop-line indicator, parent-
 *  highlight, layout-vs-canvas insertion) is handled by
 *  `ToolbarDragStrategy` downstream — same path Insert panel cards use. */
function useMediaDrag(url: string, kind: 'image' | 'video') {
  return useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startEvent = e.nativeEvent;
    // Snapshot the tile's actual rendered size — the panel's grid-cols-2
    // + aspect-square layout means tiles are typically ~112×112, but
    // resizing the panel changes that. Reading from the live DOM lets
    // the drag ghost match exactly what the user sees in the gallery
    // instead of using a hard-coded fallback.
    const tile = e.currentTarget as HTMLElement;
    const rect = tile.getBoundingClientRect();
    const ghostW = Math.round(rect.width)  || 200;
    const ghostH = Math.round(rect.height) || 150;
    const item: ToolbarItem = kind === 'image' ? {
      id: `media-image:${url}`,
      // Drop as a normal <div> with the image as a CSS BACKGROUND, not a bare
      // <img>. It then behaves like any frame: it fills/crops via
      // `background-size: cover`, can hold children + overlays, and is styled
      // like a div (the reference's "image fill" model). The dropped element uses the
      // canonical 200×150 insert size; the ghost matches the gallery tile.
      elementType: 'div',
      name: 'Image',
      defaultStyles: {
        width: '200px',
        height: '150px',
        backgroundImage: `url("${url}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // No placeholder fill: a grey bg is invisible behind an opaque photo
        // (cover fills the box) but shows through every transparent pixel of a
        // PNG/WebP cutout (logos, icons, 3D assets) — making them look "not
        // transparent". Dropping with no fill respects the image's alpha.
      },
      ghostSize: { width: ghostW, height: ghostH },
      galleryMedia: [{ url, sourceRatio: mediaImageRatioCache.get(url) ?? null }],
    } : {
      id: `media-video:${url}`,
      elementType: 'video',
      // Same split as image: dropped element keeps the canonical
      // 320×240 insert size; ghost matches the gallery tile.
      defaultStyles: {
        display: 'block',
        width: '320px',
        height: '240px',
        maxWidth: 'none',
        backgroundColor: '#1f2937',
      },
      defaultAttrs: { src: url, controls: '' },
      ghostSize: { width: ghostW, height: ghostH },
    };
    let dragStarted = false;
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    const onMove = (moveEvent: PointerEvent) => {
      if (dragStarted) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (dx * dx + dy * dy < MEDIA_DRAG_THRESHOLD_PX * MEDIA_DRAG_THRESHOLD_PX) return;
      dragStarted = true;
      cleanup();
      trace.action('media-panel:drag-start', { kind, url });
      startToolbarDrag(item, startEvent);
    };
    const onUp = () => { cleanup(); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [url, kind]);
}

/**
 * Multi-selected images become ONE native Gallery toolbar item. This mirrors
 * useMediaDrag's threshold behavior so a pointer click remains selection-only;
 * source is untouched until the normal canvas drop pipeline commits a drag.
 */
function useGallerySelectionDrag(urls: readonly string[]) {
  return useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || urls.length < 2) return;
    e.preventDefault();
    e.stopPropagation();
    const snapshot = [...urls];
    const startX = e.clientX;
    const startY = e.clientY;
    const startEvent = e.nativeEvent;
    let dragStarted = false;
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    const onMove = (moveEvent: PointerEvent) => {
      if (dragStarted) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (dx * dx + dy * dy < MEDIA_DRAG_THRESHOLD_PX * MEDIA_DRAG_THRESHOLD_PX) return;
      dragStarted = true;
      cleanup();
      const item = buildGalleryMediaToolbarItem(
        snapshot.map((url) => ({ url, sourceRatio: mediaImageRatioCache.get(url) ?? null })),
      );
      trace.action('media-panel:gallery-drag-start', { count: snapshot.length });
      startToolbarDrag(item, startEvent);
    };
    const onUp = () => cleanup();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [urls]);
}

/** Single tile in the gallery grid. Wraps the image/video preview in a
 *  `<div onPointerDown={handleDrag}>` exactly like LibraryPanel's
 *  ComponentRow — bare div, no forwardRef / memo layers between the
 *  React listener tree and the DOM target (those layers caused
 *  drop-line indicator dropouts in earlier wiring; see LibraryPanel
 *  lines 406-415 for the rationale). */
const MediaTile = React.memo(function MediaTile({ url, kind, mediaKey, isSelected, canDelete, onShiftPointerDown, onPlainPointerDown, onRequestDelete }: {
  url: string;
  kind: 'image' | 'video';
  /** R2 object key — the deletable identity. Null → standalone blob URL. */
  mediaKey: string | null;
  isSelected: boolean;
  canDelete: boolean;
  /** Shift held on pointerdown → the panel's sweep/toggle machinery. */
  onShiftPointerDown: (key: string, e: React.PointerEvent) => void;
  /** Plain pointerdown (drag intent) — panel clears multi-selection and may inspect. */
  onPlainPointerDown: () => void;
  onRequestDelete: (key: string) => void;
}) {
  const handleDrag = useMediaDrag(url, kind);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.shiftKey && mediaKey) {
      // Selection gesture — never arms the canvas drag. stopPropagation is
      // LOAD-BEARING: without it the event bubbles to the grid container's
      // own shift handler, which restarts the gesture with NO toggle target
      // — so shift+clicking an already-selected tile never removed it.
      e.preventDefault();
      e.stopPropagation();
      onShiftPointerDown(mediaKey, e);
      return;
    }
    onPlainPointerDown();
    handleDrag(e);
  };
  return (
    <div
      data-media-key={mediaKey ?? undefined}
      onPointerDown={onPointerDown}
      // Selected: border snaps to accent with NO transition — with the base
      // white border + `transition-colors`, every tile joining the selection
      // flashed white→blue under the instant outline (the reported fringe).
      className={`group relative aspect-square overflow-hidden rounded-[4px] border cursor-grab active:cursor-grabbing ${
        isSelected
          ? 'border-[var(--accent)] transition-none'
          : 'border-[var(--border-light)] hover:border-[var(--control-border-hover)] transition-colors'
      }`}
      style={isSelected ? MULTI_SELECT_OUTLINE : undefined}
      title="Drag to canvas"
    >
      {kind === 'image' ? (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover pointer-events-none"
          loading="lazy"
          draggable={false}
          onLoad={(event) => rememberMediaImageRatio(url, event.currentTarget)}
        />
      ) : (
        <video src={url} className="w-full h-full object-cover pointer-events-none" muted />
      )}
      {/* Selected: light accent wash over the artwork so membership reads at
          a glance (the outline alone was easy to miss between busy thumbs). */}
      {isSelected && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--accent, #4c8df6)', opacity: 0.08 }}
        />
      )}
      {/* Hover delete — dark grey disc, white ×. pointerdown is stopped so
          clicking it never starts a canvas drag. */}
      {canDelete && mediaKey && (
        <button
          type="button"
          aria-label="Delete asset"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onClick={(e) => { e.stopPropagation(); onRequestDelete(mediaKey); }}
          className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity cursor-pointer"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
});

interface StorageInfo {
  currentUsageMB: string;
  storageLimitMB: string;
}

function mediaDisplayName(item: UploadedFile): string {
  if (item.key) {
    const part = item.key.split('/').filter(Boolean).pop();
    if (part) return decodeURIComponent(part);
  }
  try {
    const url = new URL(item.url);
    const part = url.pathname.split('/').filter(Boolean).pop();
    if (part) return decodeURIComponent(part);
  } catch {
    // data:/blob: and malformed URLs fall back to the type label below.
  }
  return item.kind === 'image' ? 'Image' : 'Video';
}

function formatMediaBytes(size?: number): string {
  if (!size || size < 1) return 'Unknown';
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(size >= 1024 * 100 ? 0 : 1) + ' KB';
  return (size / (1024 * 1024)).toFixed(size >= 1024 * 1024 * 10 ? 0 : 1) + ' MB';
}

export default function MediaGalleryPanel({
  chrome = 'full',
  initialTab = 'all',
  workspace = false,
}: {
  chrome?: 'full' | 'embedded';
  initialTab?: MediaGalleryTab;
  workspace?: boolean;
} = {}) {
  const upsertMediaUpload = useSetAtom(upsertMediaUploadAtom);
  const [tab, setTab] = useState<MediaGalleryTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  // The backend tells us whether it owns a durable Media inventory. field
  // and standalone currently return null so we keep a truthful session-only
  // inventory without coupling UI behavior to the legacy Revyme cloud flag.
  const [loadingList, setLoadingList] = useState(true);
  const [durableInventory, setDurableInventory] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inspectedIdentity, setInspectedIdentity] = useState<string | null>(null);
  // Multi-select (shift+click / shift+sweep) — keyed by R2 object key.
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // Pending delete confirmation — the keys the ConfirmModal will remove.
  const [confirmKeys, setConfirmKeys] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const projectId = getProjectId();
  const noun: 'image' | 'video' | 'asset' = tab === 'images' ? 'image' : tab === 'videos' ? 'video' : 'asset';
  const visibleUploads = React.useMemo(
    () => tab === 'all' ? uploads : uploads.filter((item) => item.kind === (tab === 'images' ? 'image' : 'video')),
    [uploads, tab],
  );
  const filteredUploads = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return visibleUploads;
    return visibleUploads.filter((item) => {
      const key = item.key ?? deriveUploadKey(item) ?? '';
      return key.toLowerCase().includes(query) || item.url.toLowerCase().includes(query);
    });
  }, [visibleUploads, searchQuery]);
  const selectedImageUrls = React.useMemo(
    () => selectedGalleryMediaUrls(filteredUploads.filter((item) => item.kind === 'image'), selectedKeys),
    [filteredUploads, selectedKeys],
  );
  const inspectedAsset = React.useMemo(
    () => uploads.find((item) => (item.key ?? item.url) === inspectedIdentity) ?? null,
    [uploads, inspectedIdentity],
  );
  const beginGallerySelectionDrag = useGallerySelectionDrag(selectedImageUrls);

  trace.fn('MediaGalleryPanel:render', {
    tab,
    count: uploads.length,
    visibleCount: filteredUploads.length,
    selected: selectedKeys.size,
    searchActive: searchQuery.trim().length > 0,
  });

  // Ask the backend for its durable inventory instead of branching on a
  // product-mode flag. `null` is an explicit "session inventory only" answer.
  const fetchUploads = useCallback(async () => {
    setLoadingList(true);
    try {
      const [assets, storageInfo] = await Promise.all([
        backend.listAssets(projectId),
        backend.getAssetStorageInfo(projectId),
      ]);
      if (assets === null) {
        setDurableInventory(false);
        setStorage(null);
        trace.action('media:fetched', { source: 'session' });
      } else {
        setDurableInventory(true);
        setUploads(assets);
        setStorage(storageInfo);
        trace.action('media:fetched', { source: 'backend', count: assets.length });
      }
    } catch (err) {
      trace.error('media:fetch-failed', err);
      setUploadError(err instanceof Error ? err.message : 'Could not load Media.');
    } finally {
      setLoadingList(false);
    }
  }, [projectId]);

  useEffect(() => { void fetchUploads(); }, [fetchUploads]);

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [tab]);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  // Escape clears the multi-selection (the ConfirmModal handles its own).
  useEffect(() => {
    if (selectedKeys.size === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmKeys) setSelectedKeys(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKeys.size, confirmKeys]);

  // Clicking anywhere OUTSIDE the gallery grid clears the multi-selection —
  // same dismissal model as canvas selection. Capture phase so it fires even
  // when the clicked surface (canvas iframe chrome, other panels) stops
  // propagation. Skipped while the confirm modal is open: its buttons live
  // in a document.body portal, which would read as "outside" and wipe the
  // selection under a still-open modal.
  useEffect(() => {
    if (selectedKeys.size === 0) return;
    const onDown = (e: PointerEvent) => {
      if (confirmKeys) return;
      const cont = scrollRef.current;
      if (cont && e.target instanceof Node && cont.contains(e.target)) return;
      trace.action('media-select:clear-outside', { had: selectedKeys.size });
      setSelectedKeys(new Set());
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [selectedKeys.size, confirmKeys]);

  // Batch ingest belongs to the canonical Media browser. The toolbar launcher
  // intentionally remains a one-item quick insert surface.
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const skipped: string[] = [];
    let successful = 0;

    for (const [index, file] of files.entries()) {
      const kind: 'image' | 'video' | null = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : null;

      if (!kind) {
        skipped.push(file.name + ' · unsupported type');
        continue;
      }
      if (tab === 'images' && kind !== 'image') {
        skipped.push(file.name + ' · not an image');
        continue;
      }
      if (tab === 'videos' && kind !== 'video') {
        skipped.push(file.name + ' · not a video');
        continue;
      }

      trace.action('media:upload-start', { name: file.name, size: file.size, kind, batchSize: files.length });

      try {
        const result = await ingestMediaFile({
          file,
          projectId,
          kind,
          upsert: upsertMediaUpload,
          idPrefix: 'media-browser',
        });
        setUploads((prev) => (
          prev.some((item) => item.url === result.url)
            ? prev
            : [{ url: result.url, size: file.size, kind }, ...prev]
        ));
        if (!result.reusedExisting) successful += 1;
        trace.action('media:upload-success', {
          url: result.url,
          kind,
          batchSize: files.length,
          reusedExisting: result.reusedExisting,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        trace.error('media:upload-failed', { name: file.name, error: message });
      }
    }

    if (durableInventory === true && successful > 0) await fetchUploads();

    if (skipped.length > 0) {
      const first = skipped[0];
      const rest = skipped.length - 1;
      setUploadError(rest > 0 ? first + ' · +' + rest + ' more skipped' : first);
    }

    setUploading(false);
    input.value = '';
  }, [projectId, fetchUploads, durableInventory, tab, upsertMediaUpload]);

  // ─── Shift+click toggle / shift+drag marquee sweep ───────────────────────
  // A shift pointerdown arms BOTH: released within the drag threshold it's a
  // TOGGLE of that tile; moved beyond it, it's a marquee sweep in the scroll
  // container's CONTENT space (so the anchor stays put while auto-scroll
  // extends the selection up/down at the edges).
  const sweepRef = useRef<{
    anchor: { x: number; y: number };
    base: Set<string>;
    startClient: { x: number; y: number };
    lastClient: { x: number; y: number };
    moved: boolean;
    toggleKey: string | null;
    raf: number;
  } | null>(null);

  const tileRects = useCallback((): TileRect[] => {
    const cont = scrollRef.current;
    if (!cont) return [];
    const cr = cont.getBoundingClientRect();
    const rects: TileRect[] = [];
    cont.querySelectorAll<HTMLElement>('[data-media-key]').forEach((el) => {
      const key = el.dataset.mediaKey!;
      const r = el.getBoundingClientRect();
      rects.push({
        key,
        left: r.left - cr.left + cont.scrollLeft,
        top: r.top - cr.top + cont.scrollTop,
        right: r.right - cr.left + cont.scrollLeft,
        bottom: r.bottom - cr.top + cont.scrollTop,
      });
    });
    return rects;
  }, []);

  const recomputeSweep = useCallback(() => {
    const s = sweepRef.current;
    const cont = scrollRef.current;
    if (!s || !cont) return;
    const cr = cont.getBoundingClientRect();
    const b = {
      x: s.lastClient.x - cr.left + cont.scrollLeft,
      y: s.lastClient.y - cr.top + cont.scrollTop,
    };
    const swept = keysInSweep(tileRects(), s.anchor, b);
    setSelectedKeys(new Set([...s.base, ...swept]));
  }, [tileRects]);

  const beginShiftGesture = useCallback((toggleKey: string | null, e: React.PointerEvent) => {
    const cont = scrollRef.current;
    if (!cont) return;
    const cr = cont.getBoundingClientRect();
    sweepRef.current = {
      anchor: { x: e.clientX - cr.left + cont.scrollLeft, y: e.clientY - cr.top + cont.scrollTop },
      base: new Set(selectedKeys),
      startClient: { x: e.clientX, y: e.clientY },
      lastClient: { x: e.clientX, y: e.clientY },
      moved: false,
      toggleKey,
      raf: 0,
    };
    trace.action('media-sweep:begin', { toggleKey, selected: selectedKeys.size });

    const onMove = (ev: PointerEvent) => {
      const s = sweepRef.current;
      if (!s) return;
      s.lastClient = { x: ev.clientX, y: ev.clientY };
      if (!s.moved) {
        const dx = ev.clientX - s.startClient.x;
        const dy = ev.clientY - s.startClient.y;
        if (dx * dx + dy * dy < MEDIA_DRAG_THRESHOLD_PX * MEDIA_DRAG_THRESHOLD_PX) return;
        s.moved = true;
      }
      recomputeSweep();
    };
    const onUp = () => {
      const s = sweepRef.current;
      cleanup();
      if (!s) return;
      if (!s.moved && s.toggleKey) {
        // Plain shift+CLICK — toggle the tile in/out of the selection.
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          if (next.has(s.toggleKey!)) next.delete(s.toggleKey!);
          else next.add(s.toggleKey!);
          trace.action('media-select:toggle', { key: s.toggleKey, size: next.size });
          return next;
        });
      }
    };
    const cleanup = () => {
      const s = sweepRef.current;
      if (s?.raf) cancelAnimationFrame(s.raf);
      sweepRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // Edge auto-scroll loop — keeps scrolling (and re-selecting) while the
    // pointer parks near the container's top/bottom edge mid-sweep.
    const tick = () => {
      const s = sweepRef.current;
      if (!s) return;
      if (s.moved) {
        const rect = cont.getBoundingClientRect();
        const step = sweepAutoScrollStep(s.lastClient.y, rect.top, rect.bottom);
        if (step !== 0) {
          cont.scrollTop += step;
          recomputeSweep();
        }
      }
      s.raf = requestAnimationFrame(tick);
    };
    sweepRef.current.raf = requestAnimationFrame(tick);
  }, [selectedKeys, recomputeSweep]);

  // Shift+drag started on the grid's EMPTY space sweeps too (no toggle target).
  const onGridPointerDown = useCallback((e: React.PointerEvent) => {
    if (!e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    beginShiftGesture(null, e);
  }, [beginShiftGesture]);

  // ─── Delete flow ─────────────────────────────────────────────────────────
  const requestDelete = useCallback((key: string) => {
    // × on a tile that's part of a multi-selection deletes the WHOLE
    // selection; otherwise just that tile.
    const keys = selectedKeys.size > 1 && selectedKeys.has(key) ? [...selectedKeys] : [key];
    trace.action('media-delete:request', { count: keys.length });
    setConfirmKeys(keys);
  }, [selectedKeys]);

  const confirmDelete = useCallback(async () => {
    if (!confirmKeys || deleting) return;
    setDeleting(true);
    try {
      await backend.deleteAssets(projectId, confirmKeys);
      trace.action('media-delete:done', { count: confirmKeys.length });
      setSelectedKeys(new Set());
      setConfirmKeys(null);
      await fetchUploads();
    } catch (err) {
      trace.error('media-delete:failed', err);
      setUploadError(err instanceof Error ? err.message : 'Delete failed');
      setConfirmKeys(null);
    }
    setDeleting(false);
  }, [confirmKeys, deleting, projectId, fetchUploads]);

  const storageLabel = durableInventory === true
    ? storage ? `${storage.currentUsageMB} / ${storage.storageLimitMB} MB` : 'Storage'
    : durableInventory === false ? 'Session' : 'Loading…';

  return (
    <div className="flex flex-col h-full">
      {chrome === 'full' && (
        <SectionLabel size="md" right={<span className="text-[11px] text-[var(--text-disabled)]">{storageLabel}</span>}>Media</SectionLabel>
      )}

      {/* Tabs */}
      <div className={`px-3 ${chrome === 'full' ? 'mt-3' : 'mt-2'}`}>
        <ToolSegmentedControl value={tab} onChange={(value) => setTab(value as MediaGalleryTab)} options={TAB_OPTIONS} />
      </div>

      {/* Search + ingest are one compact command row. Media itself stays the visual focus. */}
      <div className="px-3 mt-2">
        <div className="flex items-center gap-1.5">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={tab === 'all' ? 'Search media…' : tab === 'images' ? 'Search images…' : 'Search videos…'}
            className="min-w-0 flex-1"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={tab === 'all' ? 'image/*,video/*' : tab === 'images' ? 'image/*' : 'video/*'}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] border border-[var(--control-border)] bg-[var(--control-bg)] px-2 text-[10px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--control-border-hover)] hover:bg-[var(--control-bg-hover)] disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden>
              <path d="M8 11V3M5 6l3-3 3 3" />
              <path d="M3 10.5v1.75A.75.75 0 0 0 3.75 13h8.5a.75.75 0 0 0 .75-.75V10.5" />
            </svg>
            {uploading ? 'Adding…' : 'Add media'}
          </button>
        </div>
      </div>

      {/* Item-local failures stay compact; the upload tray carries queue detail. */}
      {uploadError && (
        <div className="px-3 mt-2">
          <div className="rounded-[4px] border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[10px] leading-snug text-red-500 dark:text-red-400">
            {uploadError}
          </div>
        </div>
      )}

      {/* Gallery grid */}
      {filteredUploads.length > 0 ? (
        <div className="flex min-h-0 flex-1">
          <div ref={scrollRef} onPointerDown={onGridPointerDown} className="min-w-0 flex-1 overflow-y-auto scrollbar-hide p-3">
          {selectedImageUrls.length >= 2 && (
            <div
              data-media-gallery-bulk-insert
              className="sticky top-0 z-20 mb-2 flex items-center justify-between gap-2 rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-2 py-1.5"
            >
              <span className="min-w-0 truncate text-[10px] tabular-nums text-[var(--text-secondary)]">
                {selectedImageUrls.length} images selected
              </span>
              <div
                data-media-gallery-drag
                onPointerDown={beginGallerySelectionDrag}
                className="shrink-0 h-7 px-2 flex items-center gap-1.5 border border-[var(--control-border)] text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-grab active:cursor-grabbing select-none"
                title={`Drag ${selectedImageUrls.length} selected images to Canvas as one Gallery`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                  <rect x="1.5" y="1.5" width="4" height="4" />
                  <rect x="6.5" y="1.5" width="4" height="4" />
                  <rect x="1.5" y="6.5" width="4" height="4" />
                  <rect x="6.5" y="6.5" width="4" height="4" />
                </svg>
                Drag as Gallery
              </div>
            </div>
          )}
          <div className={workspace ? "grid grid-cols-4 gap-2" : "grid grid-cols-2 gap-2"}>
            {filteredUploads.map((item, i) => (
              <MediaTile
                key={item.url + i}
                url={item.url}
                kind={item.kind}
                mediaKey={deriveUploadKey(item)}
                isSelected={(() => { const k = deriveUploadKey(item); return !!k && selectedKeys.has(k); })()}
                canDelete={durableInventory === true}
                onShiftPointerDown={beginShiftGesture}
                onPlainPointerDown={() => {
                  if (selectedKeys.size) setSelectedKeys(new Set());
                  if (workspace) setInspectedIdentity(item.key ?? item.url);
                }}
                onRequestDelete={requestDelete}
              />
            ))}
          </div>
          </div>
          {workspace && (
            <aside
              data-media-details
              className="w-[220px] shrink-0 border-l border-[var(--border-light)] bg-[var(--bg-panel)]"
            >
              {inspectedAsset ? (
                <div className="p-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-hover)]">
                    {inspectedAsset.kind === 'image' ? (
                      <img src={inspectedAsset.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <video src={inspectedAsset.url} className="h-full w-full object-cover" muted />
                    )}
                  </div>
                  <div className="mt-3 space-y-2 text-[10px]">
                    <div>
                      <div className="text-[var(--text-tertiary)]">Filename</div>
                      <div className="mt-0.5 break-all text-[var(--text-primary)]">{mediaDisplayName(inspectedAsset)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[var(--text-tertiary)]">Type</div>
                        <div className="mt-0.5 capitalize text-[var(--text-primary)]">{inspectedAsset.kind}</div>
                      </div>
                      <div>
                        <div className="text-[var(--text-tertiary)]">File size</div>
                        <div className="mt-0.5 text-[var(--text-primary)]">{formatMediaBytes(inspectedAsset.size)}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--text-tertiary)]">Source</div>
                      <div className="mt-0.5 text-[var(--text-primary)]">
                        {durableInventory === true ? 'Project media' : 'Session'}
                      </div>
                    </div>
                    {inspectedAsset.lastModified && (
                      <div>
                        <div className="text-[var(--text-tertiary)]">Modified</div>
                        <div className="mt-0.5 text-[var(--text-primary)]">{inspectedAsset.lastModified}</div>
                      </div>
                    )}
                  </div>
                  {durableInventory === true && inspectedAsset.key && (
                    <button
                      type="button"
                      onClick={() => requestDelete(inspectedAsset.key!)}
                      className="mt-3 h-7 w-full rounded-[4px] border border-[var(--control-border)] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-red-500"
                    >
                      Delete asset
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center text-[10px] text-[var(--text-tertiary)]">
                  Select media to inspect
                </div>
              )}
            </aside>
          )}
        </div>
      ) : !loadingList && uploads.length > 0 && searchQuery.trim().length > 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
          <span className="text-xs font-medium text-[var(--text-secondary)]">No matching {noun}s</span>
          <span className="text-[10px] text-[var(--text-disabled)]">Try a different search.</span>
        </div>
      ) : loadingList ? (
        // Pulsating skeleton tiles (same grid + aspect as the real tiles) while
        // the first fetch is in flight — never flash "No images" before data.
        <div className="flex-1 overflow-y-auto scrollbar-hide p-3" aria-hidden>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-hover)] animate-pulse"
                style={{ animationDelay: `${i * 90}ms` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--border-light)] text-[13px] text-[var(--text-tertiary)]" aria-hidden>▦</span>
          <div>
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">No {tab === 'all' ? 'media' : tab} yet</p>
            <p className="mt-0.5 text-[10px] text-[var(--text-disabled)]">Drop files here or add them from your computer.</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 h-7 rounded-[4px] border border-[var(--control-border)] px-2 text-[10px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            Add media
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={confirmKeys !== null}
        title={confirmKeys && confirmKeys.length > 1 ? `Delete ${confirmKeys.length} ${noun}s` : `Delete ${noun}`}
        message={deleteConfirmMessage(confirmKeys?.length ?? 1, noun)}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting) setConfirmKeys(null); }}
      />
    </div>
  );
}
