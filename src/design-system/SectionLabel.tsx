import GalleryGlyph from '@/editor/media/GalleryGlyph';
// SectionLabel.tsx — Reusable section header label for sidebar panels.
// FIGUI3_SIDEBAR_SECTION_LABEL_20260925
// Used for: "Components", "Typography", "Color", "Pages", etc.
// Sizes: xl (panel title), md (section header), sm (sub-section), xs (category).

import type { ReactNode } from 'react';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';
import { FigmaBranchIcon, FigmaCmsIcon, FigmaCodeIcon, FigmaFrameIcon, FigmaGlobeIcon, FigmaImageIcon, FigmaLayersIcon, FigmaLibraryIcon, FigmaPathIcon, FigmaPlusIcon, FigmaSunIcon, FigmaTextIcon } from '@/shared/loew-figma-icons';

function HeaderIcon({ label }: { label: string }) {
  const name = label.toLowerCase();
  if (name === 'vibe') return <span data-field-section-glyph className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[var(--accent-surface)] text-[var(--accent-text)]"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5zM20 1l.8 2.2L23 4l-2.2.8L20 7l-.8-2.2L17 4l2.2-.8z" /></svg></span>;
  const Icon = /layers/.test(name) ? FigmaLayersIcon
    : /pages|templates/.test(name) ? FigmaFrameIcon
    : /components|plugins/.test(name) ? FigmaLibraryIcon
    : /vectors|icons/.test(name) ? FigmaPathIcon
    : /code|overrides/.test(name) ? FigmaCodeIcon
    : /cms|collections/.test(name) ? FigmaCmsIcon
    : /branches/.test(name) ? FigmaBranchIcon
    : /localiz|locale|translation|language/.test(name) ? FigmaGlobeIcon
    : /gallery/.test(name) ? GalleryGlyph
    : /media|images|video/.test(name) ? FigmaImageIcon
    : /typography|fonts/.test(name) ? FigmaTextIcon
    : /insert/.test(name) ? FigmaPlusIcon
    : FigmaSunIcon;
  return <span data-field-section-glyph className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[var(--accent-surface)] text-[var(--accent-text)]"><Icon size={13} /></span>;
}

type SectionLabelSize = 'xl' | 'md' | 'sm' | 'xs';

interface SectionLabelProps {
  children: ReactNode;
  size?: SectionLabelSize;
  /** Optional right-side content (+ button, info icon, etc.) */
  right?: ReactNode;
  className?: string;
  onClick?: () => void;
}

const SIZE_CLASSES: Record<SectionLabelSize, string> = {
  xl: 'text-sm font-medium text-[var(--text-primary)]',
  md: 'text-[11px] font-medium text-[var(--text-secondary)]',
  sm: 'text-[11px] font-medium text-[var(--text-secondary)]',
  xs: 'text-[10px] font-semibold text-[var(--text-secondary)]',
};

export default function SectionLabel({ children, size = 'md', right, onClick, className = '' }: SectionLabelProps) {
  const uiCase = useUiChromeCase();
  const Label = onClick ? 'button' : 'span';
  return (
    <div data-field-section-label className={`px-2 h-7 flex items-center justify-between ${className}`}>
      <Label type={onClick ? 'button' : undefined} onClick={onClick} className={`${SIZE_CLASSES[size]} inline-flex items-center gap-1.5 bg-transparent text-left ${onClick ? 'cursor-pointer' : ''}`}>
        {typeof children === 'string' && size !== 'xs' && <HeaderIcon label={children} />}
        {typeof children === 'string' ? uiCase(children) : children}
      </Label>
      {right}
    </div>
  );
}
