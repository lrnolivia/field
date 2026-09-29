import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import MediaGlyph from './MediaGlyph';

function ExpandGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M6 3H3v3M10 3h3v3M13 10v3h-3M3 10v3h3" />
    </svg>
  );
}

function CollapseGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M3 6h3V3M13 6h-3V3M10 13v-3h3M6 13v-3H3" />
    </svg>
  );
}

function BackGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9.5 4-4 4 4 4" />
    </svg>
  );
}

export default function MediaToolbarPopover({
  title,
  compact = false,
  expanded = false,
  onClose,
  onExpand,
  onBack,
  children,
}: {
  title: string;
  compact?: boolean;
  expanded?: boolean;
  onClose: () => void;
  onExpand: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState({ left: 24, bottom: 76, arrow: 112, width: 224 });

  useLayoutEffect(() => {
    const position = () => {
      const rect = document.querySelector('[data-toolbar-tool="media"]')?.getBoundingClientRect();
      if (!rect) return;
      const requestedWidth = expanded ? 840 : compact ? 224 : 480;
      const width = Math.min(requestedWidth, window.innerWidth - 24);
      const left = expanded
        ? Math.max(12, (window.innerWidth - width) / 2)
        : Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
      setAnchor({
        left,
        bottom: expanded ? 56 : window.innerHeight - rect.top + 12,
        arrow: rect.left + rect.width / 2 - left,
        width,
      });
    };

    position();
    window.addEventListener('resize', position);

    const onPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-toolbar-tool="media"]')) return;
      if (!ref.current?.contains(target)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };

    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [compact, expanded, onClose]);

  const requestedWidth = expanded ? 840 : compact ? 224 : 480;

  return createPortal(
    <motion.div
      ref={ref}
      data-modal-root
      data-media-toolbar-popover
      data-media-popover-density={expanded ? 'expanded' : compact ? 'launcher' : 'browser'}
      role="dialog"
      aria-label={title}
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 430, damping: 30, mass: 0.72 }}
      className="fixed z-[15000] overflow-visible text-[var(--text-primary)]"
      style={{
        left: anchor.left,
        bottom: anchor.bottom,
        width: `min(${requestedWidth}px, calc(100vw - 24px))`,
        maxHeight: expanded ? 'calc(100vh - 112px)' : 'min(560px, calc(100vh - 88px))',
        height: expanded ? 'min(720px, calc(100vh - 112px))' : undefined,
        transformOrigin: `${Math.max(18, Math.min(anchor.arrow, anchor.width - 18))}px calc(100% + 7px)`,
      }}
    >
      <div
        data-media-toolbar-surface
        className="relative z-10 flex min-h-0 flex-col overflow-hidden rounded-[11px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[0_18px_52px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-white/[0.025]"
        style={{ maxHeight: 'inherit', height: expanded ? '100%' : undefined }}
      >
        <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-[var(--border-light)] bg-[var(--bg-surface)]/35 px-2.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Media"
              className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <BackGlyph />
            </button>
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-hover)]/35 text-[var(--text-secondary)]" aria-hidden>
              <MediaGlyph size={14} />
            </span>
          )}
          <strong className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[-0.005em]">{title}</strong>
          <button
            type="button"
            onClick={onExpand}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
            title={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
            className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {expanded ? <CollapseGlyph /> : <ExpandGlyph />}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--bg-panel)]">{children}</div>
      </div>
      <span
        data-media-origin-pointer
        aria-hidden
        className="absolute -bottom-[5px] z-0 h-[10px] w-[10px] rotate-45 border-b border-r border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[1px_1px_1px_rgba(0,0,0,0.03)]"
        style={{ left: Math.max(14, Math.min(anchor.arrow - 5, anchor.width - 24)) }}
      />
    </motion.div>,
    document.body,
  );
}
