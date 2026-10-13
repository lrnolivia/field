import type { ReactNode } from 'react';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';

export default function ToolbarMenuHeader({ title, glyph, onExpand, expandLabel, trailing }: {
  title: string;
  glyph: ReactNode;
  onExpand?: () => void;
  expandLabel?: string;
  trailing?: ReactNode;
}) {
  const uiCase = useUiChromeCase();
  return <div data-toolbar-menu-header className="flex h-10 shrink-0 items-center gap-1.5 px-2.5">
    <span data-toolbar-menu-header-glyph aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--field-chrome-control-bg)] text-[var(--accent-text)]">{glyph}</span>
    <strong className="min-w-0 flex-1 truncate text-[11px] font-semibold">{uiCase(title)}</strong>
    {trailing}
    {onExpand && <button type="button" onClick={onExpand} aria-label={uiCase(expandLabel || `Open ${title} panel`) ?? undefined} title={uiCase(expandLabel || `Open ${title} panel`) ?? undefined}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
      <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M6 3H3v3M10 3h3v3M13 10v3h-3M3 10v3h3" /></svg>
    </button>}
  </div>;
}
