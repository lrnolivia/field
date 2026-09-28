import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAtom } from 'jotai';
import { toolbarPanelAtom } from '@/editor/toolbar-panel-store';
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
import Modal from '@/design-system/Modal';
import ModalCloseButton from '@/design-system/ModalCloseButton';
import { backend } from '@/backend';
import { getProjectId } from '@/backend/project-id';

const LIBRARY_TITLES = {
  components: 'Components', vectors: 'Vectors', templates: 'Templates',
  'code-overrides': 'Code Overrides', plugins: 'Plugins',
};

function MediaToolbarPopover({ title, onClose, onExpand, children }: {
  title: string; onClose: () => void; onExpand: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState({ left: 24, bottom: 76, arrow: 220 });
  useEffect(() => {
    const position = () => {
      const rect = document.querySelector('[data-toolbar-tool="media"]')?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(480, window.innerWidth - 24);
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
      setAnchor({ left, bottom: window.innerHeight - rect.top + 12, arrow: rect.left + rect.width / 2 - left });
    };
    position();
    window.addEventListener('resize', position);
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    };
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);
  return createPortal(
    <div ref={ref} data-modal-root data-media-toolbar-popover role="dialog" aria-label={title}
      className="fixed z-[15000] flex max-h-[min(560px,calc(100vh-88px))] w-[min(480px,calc(100vw-24px))] flex-col rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-[var(--shadow-lg)]"
      style={{ left: anchor.left, bottom: anchor.bottom }}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[var(--border-light)] px-3">
        <span className="text-[var(--text-secondary)]" aria-hidden>▦</span>
        <strong className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</strong>
        <button type="button" onClick={onExpand} aria-label={`Expand ${title}`} className="rounded-[4px] px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">Expand</button>
        <ModalCloseButton onClick={onClose} label={`Close ${title}`} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      <span aria-hidden className="absolute -bottom-[6px] h-[10px] w-[10px] rotate-45 border-b border-r border-[var(--border-light)] bg-[var(--bg-panel)]"
        style={{ left: Math.max(14, Math.min(anchor.arrow - 5, 455)) }} />
    </div>, document.body,
  );
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

  useEffect(() => { setPosition(null); setSize({ width: 480, height: 560 }); setPeeked(false); setMediaExpanded(false); }, [panel]);
  useEffect(() => {
    if (!panel || (panel.kind !== 'insert' && panel.kind !== 'library' && panel.kind !== 'media-gallery')) return;
    const closeAfterInsert = () => setPanel(null);
    window.addEventListener('field:insert-complete', closeAfterInsert);
    return () => window.removeEventListener('field:insert-complete', closeAfterInsert);
  }, [panel, setPanel]);
  useEffect(() => {
    if (!panel || panel.kind === 'media-picker' || panel.kind === 'gallery-picker' || panel.kind === 'audio-picker') return;
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
  if (panel.kind === 'media-picker') {
    const onSelect = (url: string) => {
      insertToolbarItemAtVisibleCenter(panel.media, undefined, { src: url });
      setPanel(null);
    };
    const picker = panel.media === 'image'
      ? <ImageSearchModal isOpen compact={!mediaExpanded} onClose={() => setPanel(null)} onSelect={onSelect} />
      : <VideoSearchModal isOpen compact={!mediaExpanded} onClose={() => setPanel(null)} onSelect={onSelect} />;
    return mediaExpanded ? picker : <MediaToolbarPopover title={panel.media === 'image' ? 'Images' : 'Video'}
      onClose={() => setPanel(null)} onExpand={() => setMediaExpanded(true)}>{picker}</MediaToolbarPopover>;
  }
  if (panel.kind === 'gallery-picker') {
    const wizard = <GalleryCreationWizard busy={galleryBusy} error={galleryError} onFinish={(config) => { void finishGallery(config); }} onCancel={() => setPanel(null)} />;
    return mediaExpanded ? <Modal isOpen title="Create Gallery" width={460} onClose={() => setPanel(null)}>{wizard}</Modal>
      : <MediaToolbarPopover title="Gallery" onClose={() => setPanel(null)} onExpand={() => setMediaExpanded(true)}>{wizard}</MediaToolbarPopover>;
  }
  if (panel.kind === 'audio-picker') {
    const audioContent = <div className="space-y-4 p-4 text-xs text-[var(--text-primary)]">
        <label className="block space-y-2">
          <span className="text-[var(--text-secondary)]">Audio URL</span>
          <input autoFocus type="url" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') addAudio(audioUrl); }}
            placeholder="https://…" className="h-9 w-full rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-base)] px-3 outline-none focus:border-[var(--border-focus)]" />
        </label>
        <label className="flex h-20 cursor-pointer items-center justify-center rounded-[6px] border border-dashed border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--border-focus)]">
          {audioBusy ? 'Uploading…' : 'Upload an audio file'}
          <input type="file" accept="audio/*" className="sr-only" disabled={audioBusy} onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setAudioBusy(true); setAudioError(null);
            try { addAudio(await backend.uploadAsset(getProjectId(), file)); }
            catch (error) { setAudioError(error instanceof Error ? error.message : 'Audio upload failed.'); }
            finally { setAudioBusy(false); }
          }} />
        </label>
        {audioError && <p role="alert" className="text-[var(--text-danger)]">{audioError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setPanel(null)} className="rounded-[5px] px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">Cancel</button>
          <button type="button" disabled={!audioUrl.trim()} onClick={() => addAudio(audioUrl)} className="rounded-[5px] bg-[var(--accent)] px-3 py-2 text-white disabled:opacity-40">Add Audio</button>
        </div>
      </div>;
    return mediaExpanded ? <Modal isOpen title="Add Audio" width={420} onClose={() => setPanel(null)}>{audioContent}</Modal>
      : <MediaToolbarPopover title="Audio" onClose={() => setPanel(null)} onExpand={() => setMediaExpanded(true)}>{audioContent}</MediaToolbarPopover>;
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
    <div className={`fixed inset-0 z-[15000] transition-[background-color,backdrop-filter] duration-300 ${peeked ? 'bg-transparent' : 'bg-black/25'}`}
      data-modal-root={peeked ? undefined : ''} data-toolbar-panel-backdrop
      style={{ backdropFilter: peeked ? 'blur(0px)' : 'blur(4px)', WebkitBackdropFilter: peeked ? 'blur(0px)' : 'blur(4px)', pointerEvents: peeked ? 'none' : 'auto' }}
      onPointerDown={(event) => { if (event.target === event.currentTarget && !peeked) peekAtTop(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal={!peeked} aria-label={title}
        data-toolbar-panel={panel.kind}
        data-peeked={peeked ? 'true' : 'false'}
        className="fixed flex flex-col overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-[var(--shadow-lg)] outline-none transition-[top,left] duration-[420ms] ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{
          width: `min(${size.width}px, calc(100vw - 32px))`,
          height: `min(${size.height}px, calc(100vh - 32px))`,
          left: position?.x ?? '50%', top: peeked ? 32 - size.height : position?.y ?? '50%',
          transform: position ? 'none' : 'translate(-50%, -50%)',
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
        {peeked && <button type="button" data-toolbar-panel-peek onClick={() => { setPeeked(false); dialogRef.current?.focus(); }}
          className="field-toolbar-panel-peek absolute bottom-0 left-0 z-20 flex h-8 w-full items-center justify-center gap-2 border-t border-[var(--border-light)] bg-[var(--bg-panel)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <span aria-hidden>⌄</span><span>{title}</span>
        </button>}
      </div>
    </div>, document.body,
  );
}
