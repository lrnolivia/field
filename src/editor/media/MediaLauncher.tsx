import type { ReactNode } from 'react';
import MediaGlyph from './MediaGlyph';
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

type LauncherRow = {
  action: MediaLauncherAction;
  label: string;
  glyph: ReactNode;
  disclosure?: boolean;
};

const UploadGlyph = () => <span aria-hidden className="text-[15px] leading-none">↑</span>;
const BrowseGlyph = () => <span aria-hidden className="text-[12px] leading-none">▦</span>;
const ImageGlyph = () => <span aria-hidden className="text-[12px] leading-none">◇</span>;
const GalleryGlyph = () => <span aria-hidden className="text-[12px] leading-none">▦</span>;
const VideoGlyph = () => <span aria-hidden className="text-[12px] leading-none">▶</span>;
const AudioGlyph = () => <span aria-hidden className="text-[14px] leading-none">♫</span>;
const EmbedGlyph = () => <span aria-hidden className="text-[12px] leading-none">⌁</span>;

const groups: LauncherRow[][] = [
  [
    { action: 'upload', label: 'Upload', glyph: <UploadGlyph /> },
    { action: 'browse', label: 'Browse media', glyph: <BrowseGlyph /> },
  ],
  [
    { action: 'image', label: 'Image', glyph: <ImageGlyph />, disclosure: true },
    { action: 'gallery', label: 'Gallery', glyph: <GalleryGlyph />, disclosure: true },
    { action: 'video', label: 'Video', glyph: <VideoGlyph />, disclosure: true },
    { action: 'audio', label: 'Audio', glyph: <AudioGlyph />, disclosure: true },
  ],
  [
    { action: 'embed', label: 'Embed', glyph: <EmbedGlyph />, disclosure: true },
  ],
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
    <div data-media-launcher className="w-[224px] p-1">
      <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
        <MediaGlyph size={14} />
        <span>Media</span>
      </div>

      {groups.map((rows, groupIndex) => (
        <div
          key={groupIndex}
          className={groupIndex === 0 ? '' : 'mt-1 border-t border-[var(--border-light)] pt-1'}
        >
          {rows.map((row) => (
            <button
              key={row.action}
              type="button"
              onClick={() => activate(row.action)}
              className="flex h-8 w-full items-center gap-2 rounded-[4px] px-2 text-left text-[11px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--text-secondary)]">
                {row.glyph}
              </span>
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              {row.disclosure && <span aria-hidden className="text-[var(--text-tertiary)]">›</span>}
            </button>
          ))}
        </div>
      ))}

      <div className="mt-1 border-t border-[var(--border-light)] pt-1">
        <button
          type="button"
          onClick={onPaste}
          className="flex h-8 w-full items-center gap-2 rounded-[4px] px-2 text-left text-[11px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[10px] text-[var(--text-secondary)]">⌘V</span>
          <span>Paste from clipboard</span>
        </button>
      </div>
    </div>
  );
}
