import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMobileWorkspacePresentation } from '@/editor/mobile-workspace-presentation';
import { useIsViewer } from '@/code/stores/viewer-mode-store';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import MediaLauncher from './MediaLauncher';
import MediaToolbarPopover from './MediaToolbarPopover';
import { mediaSessionAtom, upsertMediaUploadAtom, upsertSessionMediaAssetAtom } from './media-state';
import {
  acceptedMimeTypes,
  createMediaSession,
  mediaKindFromMime,
  mediaKindLabel,
  type MediaIntent,
  type MediaRoute,
} from './media-system';
import MediaGalleryPanel from '@/editor/left-toolbar/panels/MediaGalleryPanel';
import ImageSearchModal from '@/editor/ui/ImageSearchModal';
import VideoSearchModal from '@/editor/ui/VideoSearchModal';
import GalleryCreationWizard from '@/editor/gallery/GalleryCreationWizard';
import type { GalleryWizardConfig } from '@/editor/gallery/gallery-wizard-model';
import { buildGalleryWizardSourcePlan } from '@/code/gallery/gallery-wizard-plan';
import { measureGallerySourceRatio } from '@/code/gallery/gallery-source-ratio';
import { buildGalleryCarouselSyncMutations } from '@/code/gallery/gallery-mutations';
import { completeGalleryCreationSession } from '@/code/gallery/gallery-creation-session';
import { queueMutations, flushNow, type Mutation } from '@/code/mutation/mutation-queue';
import { selectedIdsAtom, getNodeFromCache } from '@/code/stores/store';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { viewportPrefixesForNode } from '@/canvas/node-ops';
import { insertToolbarItemAtSelection, insertToolbarItemAtVisibleCenter } from '@/canvas/insert-toolbar-item';
import { getProjectId } from '@/backend/project-id';
import { ingestMediaFile, isMediaUploadCancelled } from './media-ingest';
import { mediaNodeAcceptsChild, resolveToolbarMediaPlacement, type ToolbarMediaPlacement } from './media-placement';
import { CATEGORIES } from '@/shared/insert-items/element-data';
import { ELEMENT_ICON_MAP } from '@/shared/insert-items/element-icons';
import ChromeTabBar, { type ChromeTabItem } from '@/editor/ui/ChromeTabBar';

function routeTitle(route: MediaRoute, intent: MediaIntent): string {
  if (intent === 'gallery') return 'Gallery';
  if (route.view === 'embed') return 'Embed';
  if (route.kind === 'all') return 'Media';
  return mediaKindLabel(route.kind);
}

function uploadElementKind(kind: ReturnType<typeof mediaKindFromMime>): 'image' | 'video' | 'audio' | null {
  if (kind === 'image' || kind === 'vector') return 'image';
  if (kind === 'video') return 'video';
  if (kind === 'audio') return 'audio';
  return null;
}

export default function MediaPanelController({ onClose }: { onClose: () => void }) {
  const portrait = useMobileWorkspacePresentation() === 'portrait-sheet';
  const viewer = useIsViewer();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [pendingPlacement, setPendingPlacement] = useState<{ kind: 'image' | 'video' | 'audio'; url: string; placement: ToolbarMediaPlacement } | null>(null);
  const [session, setSession] = useAtom(mediaSessionAtom);
  const selectedIds = useAtomValue(selectedIdsAtom);
  const upsertUpload = useSetAtom(upsertMediaUploadAtom);
  const rememberAsset = useSetAtom(upsertSessionMediaAssetAtom);
  const [expanded, setExpanded] = useState(portrait);
  const [typeSource, setTypeSource] = useState<'media' | 'sources' | 'url'>('media');
  const [transientError, setTransientError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioBusy, setAudioBusy] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const navigate = (route: MediaRoute, intent: MediaIntent) => {
    setTransientError(null);
    setTypeSource('media');
    const galleryTargetId =
      intent === 'gallery'
      && selectedIds.length === 1
      && mediaNodeAcceptsChild(getNodeFromCache(selectedIds[0])?.type)
        ? selectedIds[0]
        : undefined;
    setSession((current) => ({
      ...current,
      surface: 'toolbar',
      route,
      intent,
      selectedIds: [],
      scrollTop: 0,
      targetId: galleryTargetId,
    }));
  };

  const goHome = () => {
    setTransientError(null);
    setTypeSource('media');
    setSession(createMediaSession({ surface: 'toolbar' }));
  };

  const resolvePlacement = (kind: 'image' | 'video' | 'audio'): ToolbarMediaPlacement => (
    resolveToolbarMediaPlacement(
      selectedIds,
      kind,
      (nodeId) => getNodeFromCache(nodeId)?.type,
    )
  );

  const placeUrl = (
    kind: 'image' | 'video' | 'audio',
    url: string,
    placement: ToolbarMediaPlacement = resolvePlacement(kind),
  ) => {
    if (viewer || (portrait && !alive.current)) return;
    if (placement.type === 'replace') {
      queueMutations([
        { type: 'updateHtmlAttrs', nodeId: placement.nodeId, attrs: { src: url } },
      ]);

      // Keep every rendered viewport copy visually aligned with the source
      // mutation immediately; flushNow remains the source-of-truth commit.
      const bridge = getCanvasBridge();
      for (const vpPrefix of viewportPrefixesForNode(placement.nodeId)) {
        bridge.setAttribute(placement.nodeId, vpPrefix, 'src', url);
      }
      flushNow();
    } else if (placement.type === 'inside') {
      const created = getNodeFromCache(placement.nodeId)
        ? insertToolbarItemAtSelection(kind, placement.nodeId, { src: url })
        : [];
      // If the remembered container disappeared during async work, degrade to
      // ordinary insertion rather than losing the Media action.
      if (created.length === 0) {
        insertToolbarItemAtVisibleCenter(kind, undefined, { src: url });
      }
    } else {
      insertToolbarItemAtVisibleCenter(kind, undefined, { src: url });
    }
    onClose();
  };

  const insertUrl = (kind: 'image' | 'video' | 'audio', url: string) => {
    if (portrait) setPendingPlacement({ kind, url, placement: resolvePlacement(kind) });
    else placeUrl(kind, url);
  };

  const ingestFile = async (file: File) => {
    const mediaKind = mediaKindFromMime(file.type);
    const elementKind = uploadElementKind(mediaKind);
    if (!mediaKind || !elementKind) {
      setTransientError('That file type is not supported in Media yet.');
      return;
    }

    const placement = resolvePlacement(elementKind);
    try {
      await ingestMediaFile({
        file,
        projectId: getProjectId(),
        kind: mediaKind,
        upsert: upsertUpload,
        idPrefix: 'toolbar',
        rememberAsset,
        // Placement is captured before the async upload begins. Retry replays
        // this exact operation instead of consulting whatever is selected later.
        onSuccess: (result) => {
          if (portrait && !alive.current) return;
          if (portrait) setPendingPlacement({ kind: elementKind, url: result.url, placement });
          else placeUrl(elementKind, result.url, placement);
        },
      });
    } catch (error) {
      if (isMediaUploadCancelled(error)) return;
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setTransientError(message);
    }
  };

  const pasteFromClipboard = async () => {
    setTransientError(null);
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((candidate) => candidate.startsWith('image/'));
          if (!type) continue;
          const blob = await item.getType(type);
          const extension = type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
          await ingestFile(new File([blob], `clipboard.${extension}`, { type }));
          return;
        }
      }

      const text = await navigator.clipboard?.readText?.();
      if (text && /^https?:\/\//i.test(text.trim())) {
        insertUrl('image', text.trim());
        return;
      }
      setTransientError('Clipboard does not contain an image or media URL.');
    } catch {
      setTransientError('Clipboard access was not available.');
    }
  };

  const addAudio = (url: string) => {
    if (!url.trim()) return;
    insertUrl('audio', url.trim());
    setAudioUrl('');
  };

  const finishGallery = async (config: GalleryWizardConfig) => {
    if (galleryBusy) return;
    setGalleryBusy(true);
    setGalleryError(null);

    // Gallery creation can spend time measuring source ratios. Preserve the
    // container chosen when the wizard opened instead of consulting whatever
    // happens to be selected after that async work finishes.
    const galleryTargetId = session.targetId;
    let galleryId: string | null = null;
    let committed = false;

    try {
      const ratios = config.frameSizing === 'source'
        ? await Promise.all(config.mediaUrls.map(measureGallerySourceRatio))
        : undefined;

      if (portrait && !alive.current) return;
      const plan = buildGalleryWizardSourcePlan({ ...config, sourceRatios: ratios });
      const created =
        galleryTargetId
        && getNodeFromCache(galleryTargetId)
        && mediaNodeAcceptsChild(getNodeFromCache(galleryTargetId)?.type)
          ? insertToolbarItemAtSelection('gallery', galleryTargetId)
          : insertToolbarItemAtVisibleCenter('gallery');
      galleryId = created[0] ?? null;
      if (!galleryId) throw new Error('Could not place the Gallery on the canvas.');

      const mutations: Mutation[] = [
        { type: 'updateStyles', nodeId: galleryId, styles: plan.rootPatch },
        { type: 'updateHtmlAttrs', nodeId: galleryId, attrs: plan.rootAttrs },
        ...plan.itemNodes.map((node) => ({ type: 'addNode' as const, parentId: galleryId!, node })),
      ];
      if (plan.stripHoverPatch) {
        plan.itemNodes.forEach((node) => {
          mutations.push({ type: 'updateCssHover', nodeId: node.id, styles: plan.stripHoverPatch! });
        });
      }
      if (plan.carousel) {
        mutations.push(...buildGalleryCarouselSyncMutations(
          plan.itemNodes.map((node) => ({ itemId: node.id, controlIds: [] })),
        ));
      }

      queueMutations(mutations);
      flushNow();
      completeGalleryCreationSession(galleryId);
      committed = true;
      onClose();
    } catch (error) {
      if (galleryId && !committed) {
        try {
          queueMutations([{ type: 'removeNode', nodeId: galleryId }]);
          flushNow();
        } catch (rollbackError) {
          // Preserve the original creation error, but make rollback failure
          // observable instead of silently hiding a potentially partial node.
          console.error('[field] Gallery creation rollback failed', rollbackError);
        } finally {
          completeGalleryCreationSession(galleryId);
        }
      }
      setGalleryError(error instanceof Error ? error.message : 'Could not create Gallery.');
    } finally {
      setGalleryBusy(false);
    }
  };

  const imagePicker = (
    <ImageSearchModal
      isOpen
      embedded
      compact={!expanded}
      onClose={() => setTypeSource('media')}
      onSelect={(url) => insertUrl('image', url)}
    />
  );
  const videoPicker = (
    <VideoSearchModal
      isOpen
      embedded
      compact={!expanded}
      onClose={() => setTypeSource('media')}
      onSelect={(url) => insertUrl('video', url)}
    />
  );

  const audioContent = (
    <div data-media-audio-picker className="space-y-3 p-3 text-[11px] text-[var(--text-primary)]">
      <div className="rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 p-3">
        <label className="block">
          <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Audio URL</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              autoFocus
              type="url"
              value={audioUrl}
              onChange={(event) => setAudioUrl(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addAudio(audioUrl); }}
              placeholder="https://…"
              className="h-8 min-w-0 flex-1 rounded-[7px] border border-[var(--control-border)] bg-[var(--control-bg)] px-2.5 outline-none transition-colors hover:border-[var(--control-border-hover)] focus:border-[var(--border-focus)]"
            />
            <button
              type="button"
              disabled={!audioUrl.trim()}
              onClick={() => addAudio(audioUrl)}
              className="h-8 rounded-[7px] bg-[var(--accent)] px-3 text-[10px] font-medium text-[var(--accent-fg)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] disabled:opacity-35"
            >
              Add
            </button>
          </div>
        </label>
      </div>
      <label className={`group flex min-h-[104px] cursor-pointer flex-col items-center justify-center rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 px-4 text-center transition-[background-color,border-color,box-shadow] ${audioBusy ? 'opacity-60 cursor-progress' : 'hover:bg-[var(--bg-hover)]/50 hover:border-[var(--control-border-hover)] hover:shadow-[0_5px_18px_rgba(0,0,0,0.05)]'}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-hover)]/45 text-[var(--accent)]">
          <svg aria-hidden width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"><path d="M6 11.5V4.25l6-1.25v7"/><circle cx="4.5" cy="11.5" r="1.5"/><circle cx="10.5" cy="10.5" r="1.5"/></svg>
        </span>
        <span className="mt-2 text-[10px] font-medium text-[var(--text-primary)]">{audioBusy ? 'Uploading…' : 'Choose audio file'}</span>
        <span className="mt-1 text-[9px] text-[var(--text-tertiary)]">Upload a local audio asset to this project</span>
        <input
          type="file"
          accept="audio/*"
          className="sr-only"
          disabled={audioBusy}
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            setAudioBusy(true);
            try { await ingestFile(file); }
            finally { setAudioBusy(false); input.value = ''; }
          }}
        />
      </label>
    </div>
  );

  const embedItems = CATEGORIES.find((category) => category.id === 'integrations')
    ?.sections.find((section) => section.id === 'embeds')?.items ?? [];
  const embedContent = (
    <div className="grid grid-cols-2 gap-1.5 p-2">
      {embedItems.map((item) => {
        const Icon = ELEMENT_ICON_MAP[item.iconKey];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              insertToolbarItemAtVisibleCenter(item.id);
              onClose();
            }}
            className="flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-[5px] border border-transparent px-2 py-2 text-[10px] text-[var(--text-secondary)] hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <span className="flex h-5 w-5 items-center justify-center">{Icon ? <Icon /> : null}</span>
            <span className="max-w-full truncate">{item.name}</span>
          </button>
        );
      })}
    </div>
  );

  const galleryContent = (
    <GalleryCreationWizard
      busy={galleryBusy}
      error={galleryError}
      onFinish={(config) => { void finishGallery(config); }}
      onCancel={goHome}
    />
  );

  const isLauncher = session.route.view === 'launcher';
  const isGallery = session.intent === 'gallery' || session.route.provider === 'gallery';
  const isTypedBrowser = session.route.view === 'browser' && session.route.kind !== 'all';

  const browserTab =
    session.route.kind === 'image' || session.route.kind === 'vector'
      ? 'images'
      : session.route.kind === 'video'
        ? 'videos'
        : session.route.kind === 'audio'
          ? 'audio'
          : 'all';

  const pickFromProjectMedia = (asset: { url: string; kind: 'image' | 'video' | 'audio' | 'vector' }) => {
    if (asset.kind === 'image' || asset.kind === 'vector') insertUrl('image', asset.url);
    else if (asset.kind === 'video') insertUrl('video', asset.url);
    else if (asset.kind === 'audio') insertUrl('audio', asset.url);
  };

  const sourceTabs: readonly ChromeTabItem<'media' | 'sources' | 'url'>[] =
    session.route.kind === 'audio'
      ? [
          { value: 'media', label: 'Media', glyph: 'media' },
          { value: 'url', label: 'URL', glyph: 'behavior' },
        ]
      : [
          { value: 'media', label: 'Media', glyph: 'media' },
          { value: 'sources', label: 'Find & create', glyph: 'search' },
        ];

  let typedContent = (
    <MediaGalleryPanel
      chrome="embedded"
      workspace={expanded}
      initialTab={browserTab}
      onPick={pickFromProjectMedia}
    />
  );

  if ((session.route.kind === 'image' || session.route.kind === 'vector') && typeSource === 'sources') {
    typedContent = imagePicker;
  } else if (session.route.kind === 'video' && typeSource === 'sources') {
    typedContent = videoPicker;
  } else if (session.route.kind === 'audio' && typeSource === 'url') {
    typedContent = audioContent;
  }

  const typedBrowserContent = isTypedBrowser ? (
    <div className="flex h-full min-h-0 flex-col" data-media-type-browser={session.route.kind}>
      <div className="shrink-0 px-2 pt-2">
        <ChromeTabBar
          value={typeSource}
          items={sourceTabs}
          onChange={setTypeSource}
          ariaLabel={mediaKindLabel(session.route.kind) + ' sources'}
          stretch
          compact
        />
      </div>
      <div className="min-h-0 flex-1">{typedContent}</div>
    </div>
  ) : null;

  let content;
  if (isLauncher) {
    content = (
      <MediaLauncher
        onNavigate={navigate}
        onUpload={() => uploadInputRef.current?.click()}
        onPaste={() => { void pasteFromClipboard(); }}
      />
    );
  } else if (isGallery) {
    content = galleryContent;
  } else if (session.route.view === 'embed') {
    content = embedContent;
  } else if (isTypedBrowser) {
    content = typedBrowserContent;
  } else {
    content = <MediaGalleryPanel chrome="embedded" workspace={expanded} onPick={pickFromProjectMedia} />;
  }

  const title = routeTitle(session.route, session.intent);


  return (
    <>
      <input
        ref={uploadInputRef}
        type="file"
        accept={acceptedMimeTypes('all')}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void ingestFile(file);
          event.currentTarget.value = '';
        }}
      />
      <AdaptiveMediaSurface
        portrait={portrait}
        title={title}
        compact={isLauncher && !expanded}
        expanded={expanded}
        onClose={onClose}
        onExpand={() => setExpanded((value) => !value)}
        onBack={isLauncher ? undefined : typeSource !== 'media' ? () => setTypeSource('media') : goHome}
      >
        {transientError && (
          <div role="alert" className="mx-2 mt-2 rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-hover)] px-2 py-1.5 text-[10px] leading-snug text-[var(--text-secondary)]">
            {transientError}
          </div>
        )}
        {pendingPlacement ? <div className="field-media-placement" data-portrait-media-placement>
          {pendingPlacement.kind === 'image' && <PlacementImage key={pendingPlacement.url} url={pendingPlacement.url} />}
          {pendingPlacement.kind === 'video' && <video src={pendingPlacement.url} controls preload="metadata" />}
          {pendingPlacement.kind === 'audio' && <audio src={pendingPlacement.url} controls preload="metadata" />}
          <p>{pendingPlacement.placement.type === 'replace' ? 'Replace the selected media' : pendingPlacement.placement.type === 'inside' ? 'Place inside the selected container' : 'Place on the visible canvas'}</p>
          <div className="field-portrait-split-row"><button type="button" onClick={() => setPendingPlacement(null)}>Choose another</button>
            <button type="button" disabled={viewer} onClick={() => { const p = pendingPlacement; setPendingPlacement(null); placeUrl(p.kind, p.url, p.placement); }}>Place {pendingPlacement.kind}</button></div>
        </div> : expanded && isLauncher && !portrait ? <MediaGalleryPanel chrome="embedded" workspace={expanded} /> : content}
      </AdaptiveMediaSurface>
    </>
  );
}


function PlacementImage({ url }: { url: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  return <div className="field-media-preview" data-preview-state={state}>
    <img src={url} alt="Selected media preview" onLoad={() => setState('ready')} onError={() => setState('error')} />
    {state !== 'ready' && <p role="status">{state === 'loading' ? 'Loading preview…' : 'Preview unavailable. You can choose another asset.'}</p>}
  </div>;
}

function AdaptiveMediaSurface({ portrait, title, compact, expanded, onClose, onExpand, onBack, children }: {
  portrait: boolean; title: string; compact: boolean; expanded: boolean; onClose: () => void; onExpand: () => void; onBack?: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (portrait) ref.current?.focus({ preventScroll: true }); }, [portrait]);
  if (!portrait) return <MediaToolbarPopover title={title} compact={compact} expanded={expanded} onClose={onClose} onExpand={onExpand} onBack={onBack}>{children}</MediaToolbarPopover>;
  return <><div className="field-portrait-scrim" onClick={onClose} /><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} data-field-no-canvas-input data-portrait-media
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),audio[controls],video[controls],[tabindex="0"]') ?? []).filter(el => el.getClientRects().length);
        if (!controls.length) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === controls[0] || document.activeElement === ref.current)) { event.preventDefault(); controls[controls.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
      }
    }} className="field-portrait-surface" data-expanded="true">
    <header>{onBack && <button type="button" onClick={onBack}>Back</button>}<div><h2>{title}</h2><span>Choose media, then place it</span></div><button type="button" onClick={onClose}>Done</button></header>
    <div className="field-portrait-content">{children}</div>
  </section></>;
}
