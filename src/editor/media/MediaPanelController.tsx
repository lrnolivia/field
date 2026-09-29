import { useRef, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
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
import { buildGalleryCarouselSyncMutations } from '@/code/gallery/gallery-mutations';
import { completeGalleryCreationSession } from '@/code/gallery/gallery-creation-session';
import { queueMutations, flushNow, type Mutation } from '@/code/mutation/mutation-queue';
import { insertToolbarItemAtVisibleCenter } from '@/canvas/insert-toolbar-item';
import { getProjectId } from '@/backend/project-id';
import { ingestMediaFile } from './media-ingest';
import { CATEGORIES } from '@/shared/insert-items/element-data';
import { ELEMENT_ICON_MAP } from '@/shared/insert-items/element-icons';

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
  const [session, setSession] = useAtom(mediaSessionAtom);
  const upsertUpload = useSetAtom(upsertMediaUploadAtom);
  const rememberAsset = useSetAtom(upsertSessionMediaAssetAtom);
  const [expanded, setExpanded] = useState(false);
  const [transientError, setTransientError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioBusy, setAudioBusy] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const navigate = (route: MediaRoute, intent: MediaIntent) => {
    setTransientError(null);
    setSession((current) => ({
      ...current,
      surface: 'toolbar',
      route,
      intent,
      selectedIds: [],
      scrollTop: 0,
    }));
  };

  const goHome = () => {
    setTransientError(null);
    setSession(createMediaSession({ surface: 'toolbar' }));
  };

  const insertUrl = (kind: 'image' | 'video' | 'audio', url: string) => {
    insertToolbarItemAtVisibleCenter(kind, undefined, { src: url });
    onClose();
  };

  const ingestFile = async (file: File) => {
    const mediaKind = mediaKindFromMime(file.type);
    const elementKind = uploadElementKind(mediaKind);
    if (!mediaKind || !elementKind) {
      setTransientError('That file type is not supported in Media yet.');
      return;
    }

    try {
      const result = await ingestMediaFile({
        file,
        projectId: getProjectId(),
        kind: mediaKind,
        upsert: upsertUpload,
        idPrefix: 'toolbar',
        rememberAsset,
      });
      insertUrl(elementKind, result.url);
    } catch (error) {
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
    try {
      const ratios = config.frameSizing === 'source'
        ? await Promise.all(config.mediaUrls.map((url) => new Promise<number | null>((resolve) => {
            const image = new Image();
            const timeout = window.setTimeout(() => resolve(null), 8000);
            image.onload = () => {
              window.clearTimeout(timeout);
              resolve(image.naturalHeight ? image.naturalWidth / image.naturalHeight : null);
            };
            image.onerror = () => {
              window.clearTimeout(timeout);
              resolve(null);
            };
            image.src = url;
          })))
        : undefined;
      const plan = buildGalleryWizardSourcePlan({ ...config, sourceRatios: ratios });
      const created = insertToolbarItemAtVisibleCenter('gallery');
      const galleryId = created[0];
      if (!galleryId) throw new Error('Could not place the Gallery on the canvas.');

      const mutations: Mutation[] = [
        { type: 'updateStyles', nodeId: galleryId, styles: plan.rootPatch },
        { type: 'updateHtmlAttrs', nodeId: galleryId, attrs: plan.rootAttrs },
        ...plan.itemNodes.map((node) => ({ type: 'addNode' as const, parentId: galleryId, node })),
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
      onClose();
    } catch (error) {
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
      onClose={onClose}
      onSelect={(url) => insertUrl('image', url)}
    />
  );
  const videoPicker = (
    <VideoSearchModal
      isOpen
      embedded
      compact={!expanded}
      onClose={onClose}
      onSelect={(url) => insertUrl('video', url)}
    />
  );

  const audioContent = (
    <div className="space-y-3 p-3 text-[11px] text-[var(--text-primary)]">
      <label className="block space-y-1.5">
        <span className="text-[var(--text-secondary)]">Audio URL</span>
        <input
          autoFocus
          type="url"
          value={audioUrl}
          onChange={(event) => setAudioUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addAudio(audioUrl);
          }}
          placeholder="https://…"
          className="h-8 w-full rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-base)] px-2.5 outline-none focus:border-[var(--border-focus)]"
        />
      </label>
      <label className="flex h-16 cursor-pointer items-center justify-center rounded-[4px] border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
        {audioBusy ? 'Uploading…' : 'Choose audio file'}
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
            try {
              await ingestFile(file);
            } finally {
              setAudioBusy(false);
              input.value = '';
            }
          }}
        />
      </label>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!audioUrl.trim()}
          onClick={() => addAudio(audioUrl)}
          className="h-7 rounded-[4px] bg-[var(--accent)] px-2.5 text-[11px] font-medium text-[var(--accent-fg)] disabled:opacity-40"
        >
          Add audio
        </button>
      </div>
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
  } else if (session.route.kind === 'image' || session.route.kind === 'vector') {
    content = imagePicker;
  } else if (session.route.kind === 'video') {
    content = videoPicker;
  } else if (session.route.kind === 'audio') {
    content = audioContent;
  } else {
    content = <MediaGalleryPanel chrome="embedded" workspace={expanded} />;
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
      <MediaToolbarPopover
        title={title}
        compact={isLauncher && !expanded}
        expanded={expanded}
        onClose={onClose}
        onExpand={() => setExpanded((value) => !value)}
        onBack={isLauncher ? undefined : goHome}
      >
        {transientError && (
          <div role="alert" className="mx-2 mt-2 rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-hover)] px-2 py-1.5 text-[10px] leading-snug text-[var(--text-secondary)]">
            {transientError}
          </div>
        )}
        {expanded && isLauncher ? <MediaGalleryPanel chrome="embedded" workspace={expanded} /> : content}
      </MediaToolbarPopover>
    </>
  );
}
