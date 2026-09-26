// SearchBar.tsx — canonical compact field search input.
// FIGUI3_SIDEBAR_SEARCH_BAR_20260925
// FIELD_SEARCH_SURFACE_RULE_20260926
//
// Search-surface rule:
// - dynamic, user-generated, or meaningfully long inventories should expose
//   this minimal search row near the top of the surface;
// - short fixed command menus / tiny radio sets should NOT add search;
// - filtering stays deterministic and local to the inventory being shown.
//
// Pages, Layers, Library, Insert-style inventories, Media, assets, fonts,
// variables, styles/tokens, and similar growing collections are expected
// to converge on this primitive when their interaction model permits it.

import { useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Focus the input on mount. */
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
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        data-field-searchbar
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-7 pl-7 pr-2 py-0 text-[11px] rounded-[5px] border border-transparent bg-[var(--control-bg)] hover:bg-[var(--control-bg-hover)] focus:bg-[var(--control-bg-hover)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--selection)]"
      />
    </div>
  );
}
