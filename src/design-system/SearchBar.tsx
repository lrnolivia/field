// SearchBar.tsx — Reusable search input with a leading magnifier icon.
// FIGUI3_SIDEBAR_SEARCH_BAR_20260925
//
// Ported from the inline `SearchBar` previously living in IconPanel.tsx
// so left-panel sections that want a search row (Pages, Layers, Library,
// Insert) all share the same shape: w-full pill, tinted bg that brightens
// on hover/focus, 14×14 magnifier inset at the left. No clear button on
// purpose — the value lives in the caller's state, and adding a × meant
// every consumer had to wire one up. Callers that want a clear affordance
// can render their own button next to the bar.

import { useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Focus the input on mount. Useful when the panel opens with the
   *  bar visible and the user's cursor is already aimed at it. */
  autoFocus?: boolean;
  className?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search…', autoFocus, className = '' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-tertiary)] pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      {/* FigUI3 sidebar control: quiet neutral fill at rest, no decorative
          perimeter, functional selection ring only while focused. */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-7 pl-7 pr-2 py-0 text-[11px] rounded-[5px] border border-transparent bg-[var(--control-bg)] hover:bg-[var(--control-bg-hover)] focus:bg-[var(--control-bg-hover)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--selection)]"
      />
    </div>
  );
}
