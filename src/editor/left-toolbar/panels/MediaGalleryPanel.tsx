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
import { useAtomValue, useSetAtom } from 'jotai';
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
import { sessionMediaAssetsAtom, upsertMediaUploadAtom, upsertSessionMediaAssetAtom } from '@/editor/media/media-state';
import { ingestMediaFile } from '@/editor/media/media-ingest';

type MediaGalleryTab = 'all' | 'images' | 'videos' | 'audio';

const TAB_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
];

type BrowserMediaKind = 'image' | 'video' | 'audio' | 'vector';

interface UploadedFile {
  url: string;
  kind: BrowserMediaKind;
  key?: string;
  name?: string;
  mimeType?: string;
  contentHash?: string;
  source?: 'upload' | 'external' | 'generated' | 'figma' | 'embed' | 'code' | 'unknown';
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
function useMediaDrag(url: string, kind: BrowserMediaKind) {
  return useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startEvent = e.nativeEvent;
    const tile = e.currentTarget as HTMLElement;
    const rect = tile.getBoundingClientRect();
    const ghostW = Math.round(rect.width) || 200;
    const ghostH = Math.round(rect.height) || 150;

    const item: ToolbarItem = kind === 'image' || kind === 'vector' ? {
      id: 'media-' + kind + ':' + url,
      name: kind === 'vector' ? 'Vector' : 'Image',
      elementType: 'div',
      defaultStyles: {
        width: '200px',
        height: '150px',
        backgroundImage: 'url("' + url + '")',
        backgroundSize: kind === 'vector' ? 'contain' : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      },
      ghostSize: { width: ghostW, height: ghostH },
      galleryMedia: [{ url, sourceRatio: mediaImageRatioCache.get(url) ?? null }],
    } : kind === 'audio' ? {
      id: 'media-audio:' + url,
      name: 'Audio',
      elementType: 'audio',
      defaultStyles: {
        display: 'block',
        width: '320px',
        height: '48px',
        maxWidth: 'none',
      },
      defaultAttrs: { src: url, controls: '' },
      ghostSize: { width: ghostW, height: ghostH },
    } : {
      id: 'media-video:' + url,
      name: 'Video',
      elementType: 'video',
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
    const onUp = () => cleanup();
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
  kind: BrowserMediaKind;
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
      className={`group relative aspect-[4/3] overflow-hidden rounded-[7px] border bg-[var(--bg-hover)]/35 cursor-grab shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:cursor-grabbing ${
        isSelected
          ? 'border-[var(--accent)] transition-none'
          : 'border-[var(--border-light)] transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-[var(--control-border-hover)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.09)]'
      }`}
      style={isSelected ? MULTI_SELECT_OUTLINE : undefined}
      title="Drag to canvas"
    >
      {kind === 'image' || kind === 'vector' ? (
        <img
          src={url}
          alt=""
          className={kind === 'vector'
            ? 'w-full h-full object-contain p-3 pointer-events-none transition-transform duration-200 group-hover:scale-[1.015]'
            : 'w-full h-full object-cover pointer-events-none transition-transform duration-200 group-hover:scale-[1.015]'}
          loading="lazy"
          draggable={false}
          onLoad={(event) => rememberMediaImageRatio(url, event.currentTarget)}
        />
      ) : kind === 'video' ? (
        <video src={url} className="w-full h-full object-cover pointer-events-none transition-transform duration-200 group-hover:scale-[1.015]" muted />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[var(--text-secondary)]">
          <span aria-hidden className="text-[20px] leading-none">♫</span>
          <span className="text-[9px] font-medium">Audio</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/28 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {kind === 'video' && (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex h-5 items-center gap-1 rounded-full border border-white/15 bg-black/45 px-1.5 text-[8px] font-medium text-white/90 backdrop-blur-[2px]">
          <span aria-hidden>▶</span>
          Video
        </span>
      )}
      {isSelected && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-[var(--accent-fg)] shadow-sm">
          ✓
        </span>
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
          className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white opacity-0 shadow-sm backdrop-blur-[2px] transition-opacity hover:bg-black/75 group-hover:opacity-100 cursor-pointer"
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
  if (item.name?.trim()) return item.name.trim();
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
  return item.kind === 'image' ? 'Image' : item.kind === 'vector' ? 'Vector' : item.kind === 'audio' ? 'Audio' : 'Video';
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
  onPick,
}: {
  chrome?: 'full' | 'embedded';
  initialTab?: MediaGalleryTab;
  workspace?: boolean;
  onPick?: (asset: { url: string; kind: BrowserMediaKind }) => void;
} = {}) {
  const upsertMediaUpload = useSetAtom(upsertMediaUploadAtom);
  const [tab, setTab] = useState<MediaGalleryTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'upload' | 'external'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  // The backend tells us whether it owns a durable Media inventory. field
  // and standalone currently return null so we keep a truthful session-only
  // inventory without coupling UI behavior to the legacy Revyme cloud flag.
  const [loadingList, setLoadingList] = useState(true);
  const [durableInventory, setDurableInventory] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const sessionMediaAssets = useAtomValue(sessionMediaAssetsAtom);
  const rememberMediaAsset = useSetAtom(upsertSessionMediaAssetAtom);
  const [duplicateCandidates, setDuplicateCandidates] = useState<Array<{ file: File; kind: BrowserMediaKind }>>([]);
  const [inspectedIdentity, setInspectedIdentity] = useState<string | null>(null);
  // Multi-select (shift+click / shift+sweep) — keyed by R2 object key.
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // Pending delete confirmation — the keys the ConfirmModal will remove.
  const [confirmKeys, setConfirmKeys] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const projectId = getProjectId();
  const noun: 'image' | 'video' | 'audio' | 'asset' = tab === 'images' ? 'image' : tab === 'videos' ? 'video' : tab === 'audio' ? 'audio' : 'asset';

  const availableUploads = React.useMemo(() => {
    const sessionRows: UploadedFile[] = sessionMediaAssets
      .filter((item) => item.kind === 'image' || item.kind === 'video' || item.kind === 'audio' || item.kind === 'vector')
      .map((item) => ({
        url: item.url,
        kind: item.kind as BrowserMediaKind,
        name: item.name,
        mimeType: item.mimeType,
        contentHash: item.contentHash,
        source: item.source,
        size: item.size,
        lastModified: item.createdAt,
      }));

    const seen = new Set<string>();
    return [...sessionRows, ...uploads].filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [uploads, sessionMediaAssets]);

  const visibleUploads = React.useMemo(() => {
    if (tab === 'all') return availableUploads;
    if (tab === 'images') return availableUploads.filter((item) => item.kind === 'image' || item.kind === 'vector');
    if (tab === 'videos') return availableUploads.filter((item) => item.kind === 'video');
    return availableUploads.filter((item) => item.kind === 'audio');
  }, [availableUploads, tab]);
  const filteredUploads = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let rows = query
      ? visibleUploads.filter((item) => {
          const key = item.key ?? deriveUploadKey(item) ?? '';
          return item.name?.toLowerCase().includes(query)
            || key.toLowerCase().includes(query)
            || item.url.toLowerCase().includes(query);
        })
      : visibleUploads;

    if (workspace && sourceFilter !== 'all') {
      rows = rows.filter((item) => {
        const source = item.source ?? (item.key ? 'upload' : 'unknown');
        return source === sourceFilter;
      });
    }

    if (!workspace) return rows;

    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortOrder === 'name') {
        return mediaDisplayName(a).localeCompare(mediaDisplayName(b), undefined, { sensitivity: 'base' });
      }

      const aTime = a.lastModified ? Date.parse(a.lastModified) : 0;
      const bTime = b.lastModified ? Date.parse(b.lastModified) : 0;
      return sortOrder === 'oldest' ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  }, [visibleUploads, searchQuery, workspace, sourceFilter, sortOrder]);

  const selectedImageUrls = React.useMemo(
    () => selectedGalleryMediaUrls(filteredUploads.filter((item) => item.kind === 'image' || item.kind === 'vector'), selectedKeys),
    [filteredUploads, selectedKeys],
  );
  const inspectedAsset = React.useMemo(
    () => availableUploads.find((item) => (item.key ?? item.url) === inspectedIdentity) ?? null,
    [availableUploads, inspectedIdentity],
  );
  const beginGallerySelectionDrag = useGallerySelectionDrag(selectedImageUrls);

  trace.fn('MediaGalleryPanel:render', {
    tab,
    count: availableUploads.length,
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
        // Session-only projects read their inventory from the project-scoped
        // Media catalog. Never leave durable/local rows from the previously
        // mounted project in component state.
        setUploads([]);
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

  useEffect(() => {
    // FieldShell can switch mounted projects without reloading the document.
    // Clear browser-local state before hydrating the next project so project A
    // can never flash or leak into project B.
    setUploads([]);
    setSelectedKeys(new Set());
    setInspectedIdentity(null);
    setDuplicateCandidates([]);
    setUploadError(null);
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

  // Batch ingest belongs to the canonical Media browser. File picker and OS
  // drag/drop both use this exact path so validation, dedup, and queue state
  // cannot diverge.
  const ingestFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const skipped: string[] = [];
    let successful = 0;

    for (const [index, file] of files.entries()) {
      const kind: BrowserMediaKind | null = file.type === 'image/svg+xml'
        ? 'vector'
        : file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : file.type.startsWith('audio/')
              ? 'audio'
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
      if (tab === 'audio' && kind !== 'audio') {
        skipped.push(file.name + ' · not audio');
        continue;
      }
      if (durableInventory === true && kind === 'audio') {
        skipped.push(file.name + ' · audio storage is not supported by this backend yet');
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
          rememberAsset: rememberMediaAsset,
        });
        setUploads((prev) => (
          prev.some((item) => item.url === result.url)
            ? prev
            : [{ url: result.url, size: file.size, kind, name: file.name }, ...prev]
        ));
        if (!result.reusedExisting) {
          successful += 1;
        } else if (durableInventory === true) {
          setDuplicateCandidates((current) => [...current, { file, kind }]);
        }
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
  }, [projectId, fetchUploads, durableInventory, tab, upsertMediaUpload, rememberMediaAsset]);

  const keepDuplicateUploads = useCallback(async () => {
    if (durableInventory !== true || duplicateCandidates.length === 0 || uploading) return;

    const candidates = duplicateCandidates;
    setDuplicateCandidates([]);
    setUploading(true);
    setUploadError(null);
    let created = 0;

    for (const { file, kind } of candidates) {
      try {
        const result = await ingestMediaFile({
          file,
          projectId,
          kind,
          upsert: upsertMediaUpload,
          idPrefix: 'media-duplicate',
          allowDuplicate: true,
          rememberAsset: rememberMediaAsset,
        });
        setUploads((prev) => [{ url: result.url, size: file.size, kind, name: file.name }, ...prev]);
        created += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not keep duplicate';
        setUploadError(message);
      }
    }

    if (created > 0) await fetchUploads();
    setUploading(false);
  }, [
    durableInventory,
    duplicateCandidates,
    uploading,
    projectId,
    upsertMediaUpload,
    rememberMediaAsset,
    fetchUploads,
  ]);


  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    await ingestFiles(files);
    input.value = '';
  }, [ingestFiles]);

  const handleBrowserDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  }, []);

  const handleBrowserDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDropActive(false);
  }, []);

  const handleBrowserDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    setDropActive(false);
    await ingestFiles(Array.from(event.dataTransfer.files ?? []));
  }, [ingestFiles]);

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
    <div
      className="relative flex h-full flex-col"
      onDragOver={handleBrowserDragOver}
      onDragLeave={handleBrowserDragLeave}
      onDrop={(event) => { void handleBrowserDrop(event); }}
    >
      {dropActive && (
        <div
          data-media-browser-drop-target
          className="pointer-events-none absolute inset-1 z-50 flex items-start justify-center rounded-[5px] border border-[var(--accent)] pt-3"
          style={{ background: 'color-mix(in srgb, var(--accent) 5%, transparent)' }}
          aria-hidden
        >
          <span className="rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-2 py-1 text-[10px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)]">
            Add to Media
          </span>
        </div>
      )}
      {chrome === 'full' && (
        <SectionLabel size="md" right={<span className="text-[11px] text-[var(--text-disabled)]">{storageLabel}</span>}>Media</SectionLabel>
      )}

      {/* Tabs */}
      <div className={`px-3 ${chrome === 'full' ? 'mt-3' : 'mt-2.5'}`}>
        <ToolSegmentedControl value={tab} onChange={(value) => setTab(value as MediaGalleryTab)} options={TAB_OPTIONS} />
      </div>

      {/* Search + ingest are one compact command row. Media itself stays the visual focus. */}
      <div className="px-3 mt-2">
        <div data-media-browser-commandbar className="flex items-center gap-1.5">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={tab === 'all' ? 'Search media…' : tab === 'images' ? 'Search images…' : tab === 'videos' ? 'Search videos…' : 'Search audio…'}
            className="min-w-0 flex-1"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={tab === 'all' ? 'image/*,video/*,audio/*' : tab === 'images' ? 'image/*' : tab === 'videos' ? 'video/*' : 'audio/*'}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--control-border)] bg-[var(--control-bg)] px-2.5 text-[10px] font-medium text-[var(--text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-[var(--control-border-hover)] hover:bg-[var(--control-bg-hover)] disabled:opacity-50"
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

      {durableInventory === true && duplicateCandidates.length > 0 && (
        <div className="px-3 mt-2">
          <div
            data-media-duplicate-notice
            className="flex min-h-8 items-center gap-2 rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-hover)] px-2 py-1.5"
          >
            <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--text-secondary)]">
              {duplicateCandidates.length > 1 ? duplicateCandidates.length + ' files · ' : ''}
              Already in Media · using existing
            </span>
            <button
              type="button"
              onClick={() => { void keepDuplicateUploads(); }}
              className="h-6 shrink-0 rounded-[3px] px-1.5 text-[10px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-active)]"
            >
              Keep {duplicateCandidates.length > 1 ? 'duplicates' : 'duplicate'}
            </button>
            <button
              type="button"
              onClick={() => setDuplicateCandidates([])}
              aria-label="Dismiss duplicate notice"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[var(--text-tertiary)] hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {workspace && (
        <div
          data-media-workspace-controls
          className="mt-2.5 flex items-center gap-2 border-y border-[var(--border-light)] bg-[var(--bg-surface)]/24 px-3 py-2"
        >
          <label className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="shrink-0 text-[9px] text-[var(--text-tertiary)]">Source</span>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as 'all' | 'upload' | 'external')}
              className="h-7 min-w-0 flex-1 rounded-[6px] border border-[var(--control-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--control-border-hover)]"
            >
              <option value="all">All</option>
              <option value="upload">Uploaded</option>
              <option value="external">External</option>
            </select>
          </label>

          <label className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="shrink-0 text-[9px] text-[var(--text-tertiary)]">Sort</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest' | 'name')}
              className="h-7 min-w-0 flex-1 rounded-[6px] border border-[var(--control-border)] bg-[var(--control-bg)] px-2 text-[10px] text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--control-border-hover)]"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      )}

      {/* Gallery grid */}
      {filteredUploads.length > 0 ? (
        <div className="flex min-h-0 flex-1">
          <div ref={scrollRef} onPointerDown={onGridPointerDown} className="min-w-0 flex-1 overflow-y-auto scrollbar-hide p-3.5">
          {selectedImageUrls.length >= 2 && (
            <div
              data-media-gallery-bulk-insert
              className="sticky top-0 z-20 mb-2.5 flex items-center justify-between gap-2 rounded-[7px] border border-[var(--border-light)] bg-[var(--bg-panel)]/95 px-2.5 py-2 shadow-[0_3px_12px_rgba(0,0,0,0.07)] backdrop-blur-md"
            >
              <span className="min-w-0 truncate text-[10px] tabular-nums text-[var(--text-secondary)]">
                {selectedImageUrls.length} images selected
              </span>
              <div
                data-media-gallery-drag
                onPointerDown={beginGallerySelectionDrag}
                className="shrink-0 flex h-7 items-center gap-1.5 rounded-[5px] border border-[var(--control-border)] px-2 text-[10px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-grab active:cursor-grabbing select-none"
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
          <div data-media-grid className={workspace ? "grid grid-cols-3 gap-2.5" : "grid grid-cols-2 gap-2.5"}>
            {filteredUploads.map((item, i) => (
              <div
                key={item.url + i}
                role={onPick ? 'button' : undefined}
                tabIndex={onPick ? 0 : undefined}
                aria-label={onPick ? 'Use ' + mediaDisplayName(item) : undefined}
                className={onPick ? 'rounded-[7px] outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]' : undefined}
                onPointerDownCapture={onPick ? (event) => event.stopPropagation() : undefined}
                onClick={onPick ? () => onPick({ url: item.url, kind: item.kind }) : undefined}
                onKeyDown={onPick ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPick({ url: item.url, kind: item.kind });
                  }
                } : undefined}
              >
                <MediaTile
                  url={item.url}
                  kind={item.kind}
                  mediaKey={deriveUploadKey(item)}
                  isSelected={(() => { const k = deriveUploadKey(item); return !!k && selectedKeys.has(k); })()}
                  canDelete={durableInventory === true && !!item.key}
                  onShiftPointerDown={beginShiftGesture}
                  onPlainPointerDown={() => {
                    if (selectedKeys.size) setSelectedKeys(new Set());
                    if (workspace) setInspectedIdentity(item.key ?? item.url);
                  }}
                  onRequestDelete={requestDelete}
                />
              </div>
            ))}
          </div>
          </div>
          {workspace && (
            <aside
              data-media-details
              className="w-[274px] shrink-0 border-l border-[var(--border-light)] bg-[var(--bg-surface)]/32"
            >
              {inspectedAsset ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-[var(--border-light)] p-3">
                    <div
                      data-media-viewer-stage
                      className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.015)]"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-[0.25]" style={{
                        backgroundImage: 'linear-gradient(45deg,var(--bg-hover) 25%,transparent 25%),linear-gradient(-45deg,var(--bg-hover) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,var(--bg-hover) 75%),linear-gradient(-45deg,transparent 75%,var(--bg-hover) 75%)',
                        backgroundSize: '14px 14px',
                        backgroundPosition: '0 0,0 7px,7px -7px,-7px 0px',
                      }} />
                      {inspectedAsset.kind === 'image' || inspectedAsset.kind === 'vector' ? (
                        <img src={inspectedAsset.url} alt="" className="relative z-[1] max-h-full max-w-full object-contain p-2" />
                      ) : inspectedAsset.kind === 'video' ? (
                        <video src={inspectedAsset.url} className="relative z-[1] max-h-full max-w-full object-contain" muted />
                      ) : (
                        <div className="relative z-[1] flex h-full w-full items-center justify-center text-[26px] text-[var(--text-tertiary)]" aria-hidden>♫</div>
                      )}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                    <div className="min-w-0">
                      <div className="break-words text-[11px] font-semibold leading-4 text-[var(--text-primary)]">{mediaDisplayName(inspectedAsset)}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-[var(--border-light)] bg-[var(--bg-hover)]/45 px-1.5 py-0.5 text-[8px] capitalize text-[var(--text-secondary)]">{inspectedAsset.kind}</span>
                        <span className="rounded-full border border-[var(--border-light)] bg-[var(--bg-hover)]/45 px-1.5 py-0.5 text-[8px] text-[var(--text-secondary)]">{formatMediaBytes(inspectedAsset.size)}</span>
                      </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-[70px_minmax(0,1fr)] gap-x-2 gap-y-2.5 text-[9px]">
                      <dt className="text-[var(--text-tertiary)]">File size</dt>
                      <dd className="text-right text-[var(--text-primary)]">{formatMediaBytes(inspectedAsset.size)}</dd>
                      <dt className="text-[var(--text-tertiary)]">Source</dt>
                      <dd className="text-right text-[var(--text-primary)]">
                        {inspectedAsset.source === 'external'
                          ? 'External'
                          : inspectedAsset.source === 'upload'
                            ? 'Uploaded'
                            : durableInventory === true ? 'Project media' : 'Session'}
                      </dd>
                      {inspectedAsset.lastModified && (
                        <>
                          <dt className="text-[var(--text-tertiary)]">Modified</dt>
                          <dd className="break-words text-right text-[var(--text-primary)]">{inspectedAsset.lastModified}</dd>
                        </>
                      )}
                      <dt className="text-[var(--text-tertiary)]">Filename</dt>
                      <dd className="break-all text-right text-[var(--text-primary)]">{mediaDisplayName(inspectedAsset)}</dd>
                    </dl>
                  </div>

                  {durableInventory === true && inspectedAsset.key && (
                    <div className="border-t border-[var(--border-light)] p-3">
                      <button
                        type="button"
                        onClick={() => requestDelete(inspectedAsset.key!)}
                        className="h-7 w-full rounded-[6px] border border-[var(--control-border)] text-[10px] text-[var(--text-secondary)] transition-colors hover:border-red-500/30 hover:bg-red-500/[0.06] hover:text-red-500"
                      >
                        Delete asset
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-5 text-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-hover)]/35 text-[13px] text-[var(--text-tertiary)]" aria-hidden>▦</span>
                  <div className="mt-3 text-[10px] font-medium text-[var(--text-secondary)]">Select media to inspect</div>
                  <div className="mt-1 max-w-[160px] text-[9px] leading-4 text-[var(--text-disabled)]">Choose an asset to preview it at full fit and review its file details.</div>
                </div>
              )}
            </aside>
          )}
        </div>
      ) : !loadingList && availableUploads.length > 0 && searchQuery.trim().length > 0 ? (
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
                className="aspect-[4/3] rounded-[7px] border border-[var(--border-light)] bg-[var(--bg-hover)]/65 animate-pulse"
                style={{ animationDelay: `${i * 90}ms` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="relative flex h-11 w-14 items-center justify-center rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 text-[13px] text-[var(--text-tertiary)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]" aria-hidden>
            <span className="absolute left-2 top-2 h-4 w-5 rounded-[3px] border border-[var(--border-light)] bg-[var(--bg-hover)]/55" />
            <span className="absolute bottom-2 right-2 h-4 w-5 rounded-[3px] border border-[var(--border-light)] bg-[var(--accent)] opacity-[0.12]" />
          </span>
          <div>
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">No {tab === 'all' ? 'media' : tab} yet</p>
            <p className="mt-0.5 text-[10px] text-[var(--text-disabled)]">Drop files here or add them from your computer.</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 h-7 rounded-[6px] border border-[var(--control-border)] bg-[var(--control-bg)] px-2.5 text-[10px] font-medium text-[var(--text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[var(--control-bg-hover)]"
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
