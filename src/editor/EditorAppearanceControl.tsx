import { useCallback, useRef, useState } from 'react';
import AppearancePopover from '@/editor/AppearancePopover';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';

export default function EditorAppearanceControl() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const uiCase = useUiChromeCase();

  return (
    <div className="relative z-10">
      <button
        ref={anchorRef}
        type="button"
        data-editor-appearance
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={uiCase('Appearance') ?? undefined}
        title={uiCase('Appearance') ?? undefined}
        onKeyDown={event => event.stopPropagation()}
        onClick={() => setOpen(value => !value)}
        className={`flex h-7 w-7 items-center justify-center rounded-[5px] border-none transition-colors ${
          open
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <svg data-appearance-brush aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6.5 8.5 5.4-6a1.4 1.4 0 0 1 2 2l-6 5.4M6.5 8.5l1.4 1.4" />
          <path d="M7.9 9.9c.5 1.9-.8 3.4-3.1 3.4H2.5c1.1-.7 1.5-1.4 1.5-2.3 0-1.5 1.1-2.6 2.5-2.5" />
        </svg>
      </button>
      {open && <AppearancePopover anchorRef={anchorRef} onClose={close} />}
    </div>
  );
}
