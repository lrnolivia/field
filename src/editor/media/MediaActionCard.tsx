import type { ReactNode } from 'react';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';

interface MediaActionCardProps {
  label: string;
  shortcut?: string;
  glyph: ReactNode;
  onClick: () => void;
  context: 'media' | 'toolbar';
}

export default function MediaActionCard({ label, glyph, onClick, context, shortcut }: MediaActionCardProps) {
  const uiCase = useUiChromeCase();

  return (
    <button
      type="button"
      data-media-action-card
      data-media-launcher-card={context === 'media' ? 'true' : undefined}
      data-toolbar-menu-tile={context === 'toolbar' ? 'true' : undefined}
      data-toolbar-card-style={context === 'toolbar' ? 'media' : undefined}
      onClick={onClick}
      aria-keyshortcuts={shortcut}
      style={{ height: 36, minHeight: 36, borderRadius: 7, fontSize: 10 }}
      className="group flex h-9 min-w-0 items-center gap-1.5 overflow-hidden rounded-[7px] border border-transparent px-1.5 text-left text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]/45 hover:text-[var(--text-primary)]"
    >
      <span
        data-media-action-card-icon
        data-toolbar-menu-tile-icon={context === 'toolbar' ? 'true' : undefined}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-light)] bg-[var(--bg-surface)]/65 text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        {glyph}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">{uiCase(label)}</span>
      {shortcut && <span className="shrink-0 text-[9px] text-[var(--text-secondary)]">{shortcut}</span>}
    </button>
  );
}

