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

import { useRef, useEffect, type KeyboardEventHandler, type FocusEventHandler, type RefObject, type InputHTMLAttributes } from 'react';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Focus the input on mount. */
  autoFocus?: boolean;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputProps?: Pick<InputHTMLAttributes<HTMLInputElement>, 'role' | 'aria-controls' | 'aria-expanded' | 'aria-activedescendant' | 'aria-autocomplete' | 'aria-describedby'>;
  onClear?: () => void;
}

export default function SearchBar({ value, onChange, placeholder = 'Search…', autoFocus, onKeyDown, onFocus, inputRef: externalRef, inputProps, onClear, className = '' }: Props) {
  const uiCase = useUiChromeCase();
  const ownRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? ownRef;
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus, inputRef]);

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
        {...inputProps}
        ref={inputRef}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        data-field-searchbar
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={uiCase(placeholder) ?? undefined}
        aria-label={uiCase(placeholder) ?? undefined}
        className={`w-full h-7 pl-7 ${onClear ? 'pr-7' : 'pr-2'} py-0 text-[11px] rounded-[5px] border border-transparent bg-[var(--control-bg)] hover:bg-[var(--control-bg-hover)] focus:bg-[var(--control-bg-hover)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--selection)]`}
      />
      {onClear && value && <button type="button" aria-label="Clear search" title="Clear search"
        className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-[5px] text-[var(--text-secondary)] hover:bg-[var(--control-bg-hover)]"
        onClick={() => { onClear(); inputRef.current?.focus(); }} onKeyDown={e => e.stopPropagation()}>×</button>}
    </div>
  );
}
