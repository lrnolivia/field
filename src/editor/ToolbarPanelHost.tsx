import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useAtom } from 'jotai';
import { toolbarPanelAtom, type ToolbarPanel } from '@/editor/toolbar-panel-store';
import LibraryPanel from '@/editor/left-toolbar/panels/LibraryPanel';
import MediaGalleryPanel from '@/editor/left-toolbar/panels/MediaGalleryPanel';
import { SecondaryPanelContent } from '@/editor/left-toolbar/panels/insert';
import { CATEGORIES, CREATIVE_CATEGORIES } from '@/shared/insert-items/element-data';
import ImageSearchModal from '@/editor/ui/ImageSearchModal';
import VideoSearchModal from '@/editor/ui/VideoSearchModal';
import { insertToolbarItemAtVisibleCenter } from '@/canvas/insert-toolbar-item';
import GalleryCreationWizard from '@/editor/gallery/GalleryCreationWizard';
import type { GalleryWizardConfig } from '@/editor/gallery/gallery-wizard-model';
import { buildGalleryWizardSourcePlan } from '@/code/gallery/gallery-wizard-plan';
import { buildGalleryCarouselSyncMutations } from '@/code/gallery/gallery-mutations';
import { queueMutations, flushNow, type Mutation } from '@/code/mutation/mutation-queue';
import { completeGalleryCreationSession } from '@/code/gallery/gallery-creation-session';
import ModalCloseButton from '@/design-system/ModalCloseButton';
import { backend } from '@/backend';
import { getProjectId } from '@/backend/project-id';
import MediaPanelController from '@/editor/media/MediaPanelController';
import MediaToolbarPopover from '@/editor/media/MediaToolbarPopover';

const LIBRARY_TITLES = {
  components: 'Components', vectors: 'Vectors', templates: 'Templates',
  'code-overrides': 'Code Overrides', plugins: 'Plugins',
};

function toolbarPanelOriginTool(panel: ToolbarPanel): string {
  if (panel.kind === 'library') return 'library';
  if (panel.kind === 'media' || panel.kind === 'media-gallery' || panel.kind === 'media-picker' || panel.kind === 'gallery-picker' || panel.kind === 'audio-picker') return 'media';
  if (panel.kind === 'insert') {
    if (panel.category === 'creative-text-effects') return 'text';
    if (panel.category === 'elements') return 'frame';
  }
  return 'frame';
}

export default function ToolbarPanelHost() {
  const [panel, setPanel] = useAtom(toolbarPanelAtom);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: 480, height: 560 });
  const [peeked, setPeeked] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [mediaExpanded, setMediaExpanded] = useState(false);
  const [originArrow, setOriginArrow] = useState(240);
  const [anchoredToToolbar, setAnchoredToToolbar] = useState(true);
  const addAudio = (url: string) => {
    if (!url.trim()) return;
    insertToolbarItemAtVisibleCenter('audio', undefined, { src: url.trim() });
    setPanel(null);
    setAudioUrl('');
    setAudioError(null);
  };

  const finishGallery = async (config: GalleryWizardConfig) => {
    if (galleryBusy) return;
    setGalleryBusy(true);
    setGalleryError(null);
    try {
      const ratios = config.frameSizing === 'source' ? await Promise.all(config.mediaUrls.map((url) => new Promise<number | null>((resolve) => {
        const image = new Image();
        const timeout = window.setTimeout(() => resolve(null), 8000);
        image.onload = () => { window.clearTimeout(timeout); resolve(image.naturalHeight ? image.naturalWidth / image.naturalHeight : null); };
        image.onerror = () => { window.clearTimeout(timeout); resolve(null); };
        image.src = url;
      }))) : undefined;
      const plan = buildGalleryWizardSourcePlan({ ...config, sourceRatios: ratios });
      const created = insertToolbarItemAtVisibleCenter('gallery');
      const galleryId = created[0];
      if (!galleryId) throw new Error('Could not place the Gallery on the canvas.');
      const mutations: Mutation[] = [
        { type: 'updateStyles', nodeId: galleryId, styles: plan.rootPatch },
        { type: 'updateHtmlAttrs', nodeId: galleryId, attrs: plan.rootAttrs },
        ...plan.itemNodes.map((node) => ({ type: 'addNode' as const, parentId: galleryId, node })),
      ];
      if (plan.stripHoverPatch) plan.itemNodes.forEach((node) => mutations.push({ type: 'updateCssHover', nodeId: node.id, styles: plan.stripHoverPatch! }));
      if (plan.carousel) mutations.push(...buildGalleryCarouselSyncMutations(plan.itemNodes.map((node) => ({ itemId: node.id, controlIds: [] }))));
      queueMutations(mutations);
      flushNow();
      completeGalleryCreationSession(galleryId);
      setPanel(null);
    } catch (error) {
      setGalleryError(error instanceof Error ? error.message : 'Could not create Gallery.');
    } finally {
      setGalleryBusy(false);
    }
  };

  useLayoutEffect(() => {
    if (!panel) return;
    const nextSize = { width: 480, height: 560 };
    setSize(nextSize);
    setPeeked(false);
    setMediaExpanded(false);

    const tool = document.querySelector(`[data-toolbar-tool="${toolbarPanelOriginTool(panel)}"]`) as HTMLElement | null;
    const width = Math.min(nextSize.width, window.innerWidth - 24);
    const height = Math.min(nextSize.height, window.innerHeight - 96);
    if (!tool) {
      setPosition({ x: Math.max(12, (window.innerWidth - width) / 2), y: Math.max(12, (window.innerHeight - height) / 2) });
      setOriginArrow(width / 2);
      setAnchoredToToolbar(false);
      return;
    }

    const rect = tool.getBoundingClientRect();
    const x = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
    const y = Math.max(12, rect.top - height - 12);
    setPosition({ x, y });
    setOriginArrow(rect.left + rect.width / 2 - x);
    setAnchoredToToolbar(true);
  }, [panel]);
  useEffect(() => {
    if (!panel || (panel.kind !== 'insert' && panel.kind !== 'library' && panel.kind !== 'media-gallery')) return;
    const closeAfterInsert = () => setPanel(null);
    window.addEventListener('field:insert-complete', closeAfterInsert);
    return () => window.removeEventListener('field:insert-complete', closeAfterInsert);
  }, [panel, setPanel]);
  useEffect(() => {
    if (!panel || panel.kind === 'media' || panel.kind === 'media-picker' || panel.kind === 'gallery-picker' || panel.kind === 'audio-picker') return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); setPanel(null); }
      if (peeked) return;
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? [])].filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) { event.preventDefault(); dialogRef.current?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); previous?.focus(); };
  }, [panel, setPanel, peeked]);

  if (!panel) return null;
  if (panel.kind === 'media') return <MediaPanelController onClose={() => setPanel(null)} />;
  if (panel.kind === 'media-picker') {
    const onSelect = (url: string) => {
      insertToolbarItemAtVisibleCenter(panel.media, undefined, { src: url });
      setPanel(null);
    };
    const picker = panel.media === 'image'
      ? <ImageSearchModal isOpen embedded compact={!mediaExpanded} onClose={() => setPanel(null)} onSelect={onSelect} />
      : <VideoSearchModal isOpen embedded compact={!mediaExpanded} onClose={() => setPanel(null)} onSelect={onSelect} />;
    return (
      <MediaToolbarPopover
        title={panel.media === 'image' ? 'Images' : 'Video'}
        expanded={mediaExpanded}
        onClose={() => setPanel(null)}
        onExpand={() => setMediaExpanded((value) => !value)}
      >
        {picker}
      </MediaToolbarPopover>
    );
  }
  if (panel.kind === 'gallery-picker') {
    const wizard = <GalleryCreationWizard busy={galleryBusy} error={galleryError} onFinish={(config) => { void finishGallery(config); }} onCancel={() => setPanel(null)} />;
    return (
      <MediaToolbarPopover
        title="Gallery"
        expanded={mediaExpanded}
        onClose={() => setPanel(null)}
        onExpand={() => setMediaExpanded((value) => !value)}
      >
        {wizard}
      </MediaToolbarPopover>
    );
  }
  if (panel.kind === 'audio-picker') {
    const audioContent = (
      <div data-toolbar-audio-picker className="space-y-3 p-3 text-[11px] text-[var(--text-primary)]">
        <div className="rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 p-3">
          <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Audio URL</span>
          <div className="mt-1.5 flex gap-2">
            <input
              autoFocus
              type="url"
              value={audioUrl}
              onChange={(event) => setAudioUrl(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addAudio(audioUrl); }}
              placeholder="https://…"
              className="h-8 min-w-0 flex-1 rounded-[7px] border border-[var(--control-border)] bg-[var(--control-bg)] px-2.5 outline-none transition-colors hover:border-[var(--control-border-hover)] focus:border-[var(--border-focus)]"
            />
            <button type="button" disabled={!audioUrl.trim()} onClick={() => addAudio(audioUrl)}
              className="h-8 rounded-[7px] bg-[var(--accent)] px-3 text-[10px] font-medium text-[var(--accent-fg)] disabled:opacity-35">
              Add
            </button>
          </div>
        </div>
        <label className={`flex min-h-[104px] cursor-pointer flex-col items-center justify-center rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 text-center transition-colors ${audioBusy ? 'cursor-progress opacity-60' : 'hover:bg-[var(--bg-hover)]/50 hover:border-[var(--control-border-hover)]'}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-hover)]/45 text-[var(--accent)]">
            <svg aria-hidden width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"><path d="M6 11.5V4.25l6-1.25v7"/><circle cx="4.5" cy="11.5" r="1.5"/><circle cx="10.5" cy="10.5" r="1.5"/></svg>
          </span>
          <span className="mt-2 text-[10px] font-medium text-[var(--text-primary)]">{audioBusy ? 'Uploading…' : 'Choose audio file'}</span>
          <span className="mt-1 text-[9px] text-[var(--text-tertiary)]">Upload a local audio asset</span>
          <input type="file" accept="audio/*" className="sr-only" disabled={audioBusy} onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            setAudioBusy(true); setAudioError(null);
            try { addAudio(await backend.uploadAsset(getProjectId(), file)); }
            catch (error) { setAudioError(error instanceof Error ? error.message : 'Audio upload failed.'); }
            finally { setAudioBusy(false); input.value = ''; }
          }} />
        </label>
        {audioError && <p role="alert" className="text-[10px] text-[var(--text-danger)]">{audioError}</p>}
      </div>
    );
    return (
      <MediaToolbarPopover
        title="Audio"
        expanded={mediaExpanded}
        onClose={() => setPanel(null)}
        onExpand={() => setMediaExpanded((value) => !value)}
      >
        {audioContent}
      </MediaToolbarPopover>
    );
  }
  const category = panel.kind === 'insert'
    ? panel.categoryData ?? [...CATEGORIES, ...CREATIVE_CATEGORIES].find((entry) => entry.id === panel.category)
    : null;
  const title = panel.kind === 'library' ? LIBRARY_TITLES[panel.section]
    : panel.kind === 'media-gallery' ? 'Media Gallery'
      : panel.section ? category?.sections.find((entry) => entry.id === panel.section)?.label ?? category?.label
        : category?.label ?? 'Insert';

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchoredToToolbar(false);
    event.preventDefault();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const onMove = (move: PointerEvent) => {
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - rect.width - 8, move.clientX - offsetX)),
        y: Math.max(8, Math.min(window.innerHeight - rect.height - 8, move.clientY - offsetY)),
      });
    };
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ x: rect.left, y: rect.top });
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;
    const move = (next: PointerEvent) => {
      setSize({
        width: Math.max(340, Math.min(window.innerWidth - rect.left - 8, startWidth + next.clientX - startX)),
        height: Math.max(300, Math.min(window.innerHeight - rect.top - 8, startHeight + next.clientY - startY)),
      });
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
    document.body.style.cursor = 'nwse-resize';
  };

  const peekAtTop = () => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ x: rect.left, y: rect.top });
    setSize({ width: rect.width, height: rect.height });
    setPeeked(true);
    dialogRef.current?.blur();
  };

  return createPortal(
    <div className="field-toolbar-panel-backdrop fixed inset-0 z-[15000] bg-transparent"
      data-modal-root={peeked ? undefined : ''} data-toolbar-panel-backdrop
      style={{ pointerEvents: peeked ? 'none' : 'auto' }}
      onPointerDown={(event) => { if (event.target === event.currentTarget && !peeked) peekAtTop(); }}>
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={!peeked}
        aria-label={title}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.75 }}
        data-toolbar-panel={panel.kind}
        data-peeked={peeked ? 'true' : 'false'}
        className="field-toolbar-panel-surface fixed flex flex-col overflow-hidden rounded-[11px] border border-[var(--border-light)] bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-[0_18px_52px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08)] outline-none"
        style={{
          width: `min(${size.width}px, calc(100vw - 32px))`,
          height: `min(${size.height}px, calc(100vh - 32px))`,
          left: position?.x ?? '50%', top: peeked ? 32 - size.height : position?.y ?? '50%',
          transform: position ? 'none' : 'translate(-50%, -50%)',
          transformOrigin: anchoredToToolbar ? `${Math.max(18, Math.min(originArrow, size.width - 18))}px calc(100% + 7px)` : 'center',
          pointerEvents: 'auto',
        }}>
        <div className="flex h-11 shrink-0 cursor-move select-none items-center gap-2 border-b border-[var(--border-light)] px-4"
          onPointerDown={startDrag}>
          <span className="text-[var(--text-secondary)]" aria-hidden>▦</span>
          <h2 className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</h2>
          <ModalCloseButton onClick={() => setPanel(null)} label={`Close ${title}`} />
        </div>
        <div data-toolbar-panel-resize onPointerDown={startResize} title="Resize panel"
          className={`absolute bottom-0 right-0 z-10 flex h-4 w-4 cursor-nwse-resize items-end justify-end ${peeked ? 'hidden' : ''}`}>
          <svg aria-hidden width="9" height="9" viewBox="0 0 9 9" className="mb-[3px] mr-[3px] text-[var(--text-disabled)]"><path d="M8 1 1 8M8 5 5 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {panel.kind === 'library' && <LibraryPanel mode="library" focusSection={panel.section} />}
          {panel.kind === 'media-gallery' && <MediaGalleryPanel />}
          {panel.kind === 'insert' && category && <div className="flex h-full min-h-0 flex-col"><SecondaryPanelContent category={category} sectionId={panel.section} /></div>}
        </div>
        {anchoredToToolbar && !peeked && (
          <span
            data-toolbar-panel-origin-pointer
            aria-hidden
            className="absolute -bottom-[6px] h-[10px] w-[10px] rotate-45 border-b border-r border-[var(--border-light)] bg-[var(--bg-panel)]"
            style={{ left: Math.max(14, Math.min(originArrow - 5, size.width - 24)) }}
          />
        )}
        {peeked && <button type="button" data-toolbar-panel-peek onClick={() => { setPeeked(false); dialogRef.current?.focus(); }}
          className="field-toolbar-panel-peek absolute bottom-0 left-0 z-20 flex h-8 w-full items-center justify-center gap-2 border-t border-[var(--border-light)] bg-[var(--bg-panel)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <span aria-hidden>⌄</span><span>{title}</span>
        </button>}
      </motion.div>
    </div>, document.body,
  );
}
