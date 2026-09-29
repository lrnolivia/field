import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import MediaGlyph from './MediaGlyph';

function ExpandGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M6 3H3v3M10 3h3v3M13 10v3h-3M3 10v3h3" />
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
  onClose,
  onExpand,
  onBack,
  children,
}: {
  title: string;
  compact?: boolean;
  onClose: () => void;
  onExpand: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState({ left: 24, bottom: 76, arrow: 112 });

  useEffect(() => {
    const position = () => {
      const rect = document.querySelector('[data-toolbar-tool="media"]')?.getBoundingClientRect();
      if (!rect) return;
      const requestedWidth = compact ? 224 : 480;
      const width = Math.min(requestedWidth, window.innerWidth - 24);
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
      setAnchor({
        left,
        bottom: window.innerHeight - rect.top + 12,
        arrow: rect.left + rect.width / 2 - left,
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
  }, [compact, onClose]);

  const requestedWidth = compact ? 224 : 480;

  return createPortal(
    <div
      ref={ref}
      data-modal-root
      data-media-toolbar-popover
      data-media-popover-density={compact ? 'launcher' : 'browser'}
      role="dialog"
      aria-label={title}
      className="fixed z-[15000] flex max-h-[min(560px,calc(100vh-88px))] flex-col rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-[var(--shadow-lg)]"
      style={{
        left: anchor.left,
        bottom: anchor.bottom,
        width: `min(${requestedWidth}px, calc(100vw - 24px))`,
      }}
    >
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-[var(--border-light)] px-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Media"
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <BackGlyph />
          </button>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center text-[var(--text-secondary)]" aria-hidden>
            <MediaGlyph size={14} />
          </span>
        )}
        <strong className="min-w-0 flex-1 truncate text-[11px] font-semibold">{title}</strong>
        <button
          type="button"
          onClick={onExpand}
          aria-label={`Expand ${title}`}
          title={`Expand ${title}`}
          className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <ExpandGlyph />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      <span
        aria-hidden
        className="absolute -bottom-[6px] h-[10px] w-[10px] rotate-45 border-b border-r border-[var(--border-light)] bg-[var(--bg-panel)]"
        style={{ left: Math.max(14, Math.min(anchor.arrow - 5, requestedWidth - 24)) }}
      />
    </div>,
    document.body,
  );
}
