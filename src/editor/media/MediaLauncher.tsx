import type { ReactNode } from 'react';
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
  description: string;
  glyph: ReactNode;
};

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-light)] bg-[var(--bg-surface)]/65 text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {children}
    </span>
  );
}

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
  { action: 'image', label: 'Image', description: 'Stock, upload, or URL', glyph: <ImageGlyph /> },
  { action: 'gallery', label: 'Gallery', description: 'Compose image sets', glyph: <GalleryGlyph /> },
  { action: 'video', label: 'Video', description: 'Search or upload', glyph: <VideoGlyph /> },
  { action: 'audio', label: 'Audio', description: 'File or URL', glyph: <AudioGlyph /> },
];

export default function MediaLauncher({ onNavigate, onUpload, onPaste }: MediaLauncherProps) {
  const activate = (action: MediaLauncherAction) => {
    if (action === 'upload') {
      onUpload();
      return;
    }
    onNavigate(routeForLauncherAction(action), intentForLauncherAction(action));
  };

  return (
    <div data-media-launcher className="w-[224px] p-2">
      <button
        type="button"
        onClick={() => activate('browse')}
        data-media-launcher-featured
        className="group relative w-full overflow-hidden rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-surface)]/70 p-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]/45"
      >
        <div className="pointer-events-none absolute -right-4 -top-5 h-20 w-20 rounded-full bg-[var(--accent)] opacity-[0.07] blur-xl" />
        <div className="flex items-center gap-2.5">
          <IconFrame><BrowseGlyph /></IconFrame>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-[var(--text-primary)]">Browse media</div>
            <div className="mt-0.5 text-[9px] leading-3.5 text-[var(--text-tertiary)]">Your project assets in one place</div>
          </div>
          <span aria-hidden className="text-[13px] text-[var(--text-disabled)] transition-transform group-hover:translate-x-0.5">›</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <span className="aspect-[4/3] rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-hover)]/55" />
          <span className="aspect-[4/3] rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-active)]/55" />
          <span className="aspect-[4/3] rounded-[4px] border border-[var(--border-light)] bg-[var(--accent)] opacity-[0.12]" />
        </div>
      </button>

      <button
        type="button"
        onClick={onUpload}
        className="mt-1.5 flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[10px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <span className="flex h-5 w-5 items-center justify-center text-[var(--text-secondary)]"><UploadGlyph /></span>
        <span className="min-w-0 flex-1 truncate">Upload from computer</span>
        <span className="text-[9px] text-[var(--text-disabled)]">⌘U</span>
      </button>

      <div className="my-2 border-t border-[var(--border-light)]" />

      <div className="grid grid-cols-2 gap-1.5">
        {creationCards.map((card) => (
          <button
            key={card.action}
            type="button"
            onClick={() => activate(card.action)}
            className="group min-w-0 rounded-[7px] border border-transparent px-2 py-2 text-left transition-colors hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]/45"
          >
            <IconFrame>{card.glyph}</IconFrame>
            <div className="mt-2 text-[10px] font-medium text-[var(--text-primary)]">{card.label}</div>
            <div className="mt-0.5 truncate text-[8px] text-[var(--text-tertiary)]">{card.description}</div>
          </button>
        ))}
      </div>

      <div className="my-2 border-t border-[var(--border-light)]" />

      <button
        type="button"
        onClick={() => activate('embed')}
        className="flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-left text-[10px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <span className="flex h-5 w-5 items-center justify-center text-[var(--text-secondary)]"><EmbedGlyph /></span>
        <span className="min-w-0 flex-1">Embed</span>
        <span aria-hidden className="text-[var(--text-tertiary)]">›</span>
      </button>
      <button
        type="button"
        onClick={onPaste}
        className="flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-left text-[10px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <span className="flex h-5 w-5 items-center justify-center text-[9px] text-[var(--text-secondary)]">⌘V</span>
        <span>Paste from clipboard</span>
      </button>
    </div>
  );
}
