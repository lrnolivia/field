import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { backend } from '@/backend';
import { getProjectId } from '@/backend/project-id';
import type { ProjectMediaAsset } from '@/backend/types';
import { sessionMediaAssetsAtom } from './media-state';
import MediaActionCard from './MediaActionCard';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';
import {
  intentForLauncherAction,
  routeForLauncherAction,
  type MediaLauncherAction,
  type MediaRoute,
  type MediaIntent,
} from './media-system';

export interface MediaLauncherProps {
  onNavigate: (route: MediaRoute, intent: MediaIntent) => void;
  onUpload: () => void;
  onPaste: () => void;
}

type LauncherActionCard = {
  action: MediaLauncherAction;
  label: string;
  glyph: ReactNode;
};

const UploadGlyph = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 10.5V3.5M5.5 6 8 3.5 10.5 6" />
    <path d="M3 10.25v1.5A1.25 1.25 0 0 0 4.25 13h7.5A1.25 1.25 0 0 0 13 11.75v-1.5" />
  </svg>
);
const BrowseGlyph = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.15">
    <rect x="2.5" y="2.5" width="4.25" height="4.25" rx="1" />
    <rect x="9.25" y="2.5" width="4.25" height="4.25" rx="1" />
    <rect x="2.5" y="9.25" width="4.25" height="4.25" rx="1" />
    <rect x="9.25" y="9.25" width="4.25" height="4.25" rx="1" />
  </svg>
);
const ImageGlyph = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="1.5" />
    <circle cx="5.25" cy="5.75" r="1" />
    <path d="m4 11 2.75-2.75L9 10.5l1.5-1.5L13 11.5" />
  </svg>
);
const GalleryGlyph = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.15">
    <rect x="2" y="3" width="7.25" height="8" rx="1.25" />
    <path d="M6.75 5.25h5.1A1.15 1.15 0 0 1 13 6.4v6.35" />
  </svg>
);
const VideoGlyph = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.25" y="3" width="8.5" height="10" rx="1.5" />
    <path d="m10.75 6.25 3-1.5v6.5l-3-1.5z" />
  </svg>
);
const AudioGlyph = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 11.5V4.25l6-1.25v7" />
    <circle cx="4.5" cy="11.5" r="1.5" />
    <circle cx="10.5" cy="10.5" r="1.5" />
  </svg>
);
const EmbedGlyph = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 4-4 4 4 4M10 4l4 4-4 4" />
  </svg>
);

const creationCards: LauncherActionCard[] = [
  { action: 'image', label: 'Image', glyph: <ImageGlyph /> },
  { action: 'gallery', label: 'Gallery', glyph: <GalleryGlyph /> },
  { action: 'video', label: 'Video', glyph: <VideoGlyph /> },
  { action: 'audio', label: 'Audio', glyph: <AudioGlyph /> },
];

export default function MediaLauncher({ onNavigate, onUpload, onPaste }: MediaLauncherProps) {
  const uiCase = useUiChromeCase();
  const projectId = getProjectId();
  const sessionAssets = useAtomValue(sessionMediaAssetsAtom);
  const [inventory, setInventory] = useState<{ projectId: string; assets: ProjectMediaAsset[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void backend.listAssets(projectId).then((assets) => {
      if (!cancelled) setInventory({ projectId, assets: assets ?? [] });
    }).catch(() => {
      if (!cancelled) setInventory({ projectId, assets: [] });
    });
    return () => { cancelled = true; };
  }, [projectId]);
  const latestImages = useMemo(() => {
    const rows = [
      ...sessionAssets.filter(asset => asset.projectId === projectId).map(asset => ({ ...asset, lastModified: asset.createdAt })),
      ...(inventory?.projectId === projectId ? inventory.assets : []),
    ];
    const seen = new Set<string>();
    return rows.filter(asset => {
      if ((asset.kind !== 'image' && asset.kind !== 'vector') || seen.has(asset.url)) return false;
      seen.add(asset.url);
      return true;
    }).sort((a, b) => (Date.parse(b.lastModified ?? '') || 0) - (Date.parse(a.lastModified ?? '') || 0)).slice(0, 3);
  }, [projectId, sessionAssets, inventory]);
  const activate = (action: MediaLauncherAction) => {
    if (action === 'upload') {
      onUpload();
      return;
    }
    onNavigate(routeForLauncherAction(action), intentForLauncherAction(action));
  };

  return (
    <div data-media-launcher className="w-full p-1.5">
      <button
        type="button"
        onClick={onUpload}
        className="mt-1.5 flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[10px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <span className="flex h-5 w-5 items-center justify-center text-[var(--text-secondary)]"><UploadGlyph /></span>
        <span className="min-w-0 flex-1 truncate">{uiCase('Upload from computer')}</span>
      </button>

      <div className="my-2 border-t border-[var(--border-light)]" />

      <button
        type="button"
        onClick={() => activate('embed')}
        className="flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-left text-[10px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <span className="flex h-5 w-5 items-center justify-center text-[var(--text-secondary)]"><EmbedGlyph /></span>
        <span className="min-w-0 flex-1">{uiCase('Embed')}</span>
        <span aria-hidden className="text-[var(--text-tertiary)]">›</span>
      </button>
      <button
        type="button"
        onClick={onPaste}
        className="flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-left text-[10px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <span className="flex h-5 w-5 items-center justify-center text-[9px] text-[var(--text-secondary)]">⌘V</span>
        <span>{uiCase('Paste from clipboard')}</span>
      </button>
      <div className="grid grid-cols-2 gap-1.5">
        {creationCards.map((card) => (
          <MediaActionCard
            key={card.action}
            context="media"
            label={card.label}
            glyph={card.glyph}
            onClick={() => activate(card.action)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => activate('browse')}
        data-media-launcher-featured
        className="group relative mt-1.5 w-full overflow-hidden rounded-[9px] border-0 bg-[var(--accent)] p-2 text-left text-[var(--accent-text-fg)] transition-[filter] hover:brightness-110"
      >
        <div className="flex items-center gap-2.5">
          <span data-media-launcher-featured-icon className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-white/15"><BrowseGlyph /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold">{uiCase('Browse media')}</div>
            <div className="mt-0.5 text-[9px] leading-3.5">{uiCase('Your project assets in one place')}</div>
          </div>
          <span aria-hidden className="text-[13px] transition-transform group-hover:translate-x-0.5">›</span>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {[<ImageGlyph key="image" />, <VideoGlyph key="video" />, <AudioGlyph key="audio" />].map((glyph, index) => (
            <span key={index} data-media-launcher-preview className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[4px] border border-white/15 bg-white/15">
              {latestImages[index]
                ? <img src={latestImages[index].url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                : <span className="opacity-25">{glyph}</span>}
            </span>
          ))}
        </div>
      </button>
    </div>
  );
}
