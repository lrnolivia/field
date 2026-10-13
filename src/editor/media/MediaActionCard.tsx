import type { ReactNode, PointerEventHandler } from 'react';
import { motion } from 'motion/react';
import { FieldGlyph } from '@/editor/glyph';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';

interface MediaActionCardProps {
  label: string;
  shortcut?: string;
  glyph: ReactNode;
  onClick: () => void;
  context: 'media' | 'toolbar' | 'insert';
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  itemId?: string;
  ariaLabel?: string;
  tone?: 'accent' | 'neutral';
}

export default function MediaActionCard({ label, glyph, onClick, context, shortcut, onPointerDown, itemId, ariaLabel, tone = 'accent' }: MediaActionCardProps) {
  const uiCase = useUiChromeCase();
  const large = context === 'insert';

  return (
    <motion.button initial="rest" whileHover="hover" whileFocus="hover" whileTap="tap"
      type="button"
      data-toolbar-item={itemId}
      data-insert-card={large ? 'true' : undefined}
      onPointerDown={onPointerDown}
      aria-label={ariaLabel}
      data-media-action-card
      data-card-tone={tone}
      data-media-launcher-card={context === 'media' ? 'true' : undefined}
      data-toolbar-menu-tile={context === 'toolbar' ? 'true' : undefined}
      data-toolbar-card-style={context === 'toolbar' ? 'media' : undefined}
      onClick={onClick}
      aria-keyshortcuts={shortcut}
      style={{ height: large ? 56 : 36, minHeight: large ? 56 : 36, borderRadius: 7, fontSize: large ? 11 : 10 }}
      className={`group flex h-9 min-w-0 items-center gap-1.5 overflow-hidden rounded-[7px] border border-transparent px-1.5 text-left text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]/45 hover:text-[var(--text-primary)] ${large ? 'cursor-grab' : ''}`}
    >
      <span
        data-media-action-card-icon
        data-toolbar-menu-tile-icon={context === 'toolbar' ? 'true' : undefined}
        style={large ? { width: 34, height: 34 } : undefined}
        className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-[var(--border-light)] bg-[var(--accent-surface)] text-[var(--accent-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <FieldGlyph behavior="media" className="h-full w-full">{glyph}</FieldGlyph>
      </span>
      <span className={`min-w-0 flex-1 font-medium text-[var(--text-primary)] ${large ? 'line-clamp-3 leading-snug break-words' : 'truncate'}`}>{uiCase(label)}</span>
      {shortcut && <span className="shrink-0 text-[9px] text-[var(--text-secondary)]">{shortcut}</span>}
    </motion.button>
  );
}
