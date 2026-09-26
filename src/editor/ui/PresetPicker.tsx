// PresetPicker.tsx — Popup for selecting design preset tokens.
// Shows filtered tokens by property type. Click to apply var(--token-name).
// Uses portal positioning near the anchor element.

import { useMemo, useRef, useEffect, useState } from 'react';
import type { PresetToken } from '@/shared/types';
import { trace } from '@/shared/debug-trace';
import ToolPopup from './ToolPopup';

// ─── Category → property matching ────────────────────────────────────────────

const COLOR_PROPS = new Set([
  'backgroundColor', 'color', 'borderColor', 'borderTopColor', 'borderRightColor',
  'borderBottomColor', 'borderLeftColor', 'textDecorationColor', 'outlineColor',
  'caretColor', 'accentColor', 'fill', 'stroke', 'stopColor', 'floodColor',
  'columnRuleColor',
]);

const TYPOGRAPHY_PROPS = new Set([
  'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight',
  'wordSpacing', 'textIndent',
]);

const SPACING_PROPS = new Set([
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'gap', 'rowGap', 'columnGap', 'top', 'left', 'right', 'bottom',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'inset', 'insetBlock', 'insetInline',
]);

const RADIUS_PROPS = new Set([
  'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius',
]);

const SHADOW_PROPS = new Set([
  'boxShadow', 'textShadow',
]);

function getMatchingCategories(property: string): Set<PresetToken['category']> {
  const cats = new Set<PresetToken['category']>();
  if (COLOR_PROPS.has(property)) cats.add('color');
  if (TYPOGRAPHY_PROPS.has(property)) cats.add('typography');
  if (SPACING_PROPS.has(property)) cats.add('spacing');
  if (RADIUS_PROPS.has(property)) cats.add('radius');
  if (SHADOW_PROPS.has(property)) cats.add('shadow');
  if (property === 'border' || property === 'WebkitTextStroke') cats.add('border');
  // 'other' category always matches
  cats.add('other');
  return cats;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface PresetPickerProps {
  property: string;
  tokens: PresetToken[];
  onSelect: (tokenName: string) => void;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PresetPicker({ property, tokens, onSelect, isOpen, onClose, anchorRef }: PresetPickerProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const matchingCategories = useMemo(() => getMatchingCategories(property), [property]);

  const filteredTokens = useMemo(() => {
    return tokens.filter(t => matchingCategories.has(t.category));
  }, [tokens, matchingCategories]);

  const visibleTokens = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredTokens;
    return filteredTokens.filter((token) =>
      token.name.toLowerCase().includes(q)
      || (token.label || '').toLowerCase().includes(q)
      || token.value.toLowerCase().includes(q),
    );
  }, [filteredTokens, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    trace.action('preset-picker:open', { property, tokenCount: filteredTokens.length });
  }, [isOpen, property, filteredTokens.length]);

  const closeWithFocus = () => {
    onClose();
    requestAnimationFrame(() => anchorRef.current?.focus({ preventScroll: true }));
  };

  if (!isOpen) return null;

  const handleSelect = (tokenName: string) => {
    onSelect(tokenName);
    closeWithFocus();
    trace.action('preset-picker:select', { property, tokenName });
  };

  return (
    <ToolPopup
      isOpen={isOpen}
      onClose={closeWithFocus}
      title="Styles"
      ariaLabel="Style presets"
      anchorRef={anchorRef}
      width={280}
      initialFocusRef={searchInputRef}
      outsidePointerMode="shield"
      hideHeader
      contentClassName="w-full flex-shrink-0 overflow-y-auto overflow-x-hidden scrollbar-hide"
    >
      <div
        data-preset-picker-figui3
        className="w-full"
      >
        <div className="h-10 px-3 flex items-center gap-1 border-b border-[var(--border-light)]">
          <button type="button" className="h-7 px-2 rounded-[7px] bg-[var(--bg-selected)] text-xs font-medium text-[var(--text-primary)]">Custom</button>
          <button
            type="button"
            aria-disabled="true"
            title="Shared libraries are not connected in field yet"
            className="h-7 px-2 rounded-[7px] text-xs text-[var(--text-disabled)] cursor-default"
          >
            Libraries
          </button>
          <button type="button" onClick={closeWithFocus} className="ml-auto h-7 w-7 flex items-center justify-center rounded-[7px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]" aria-label="Close styles">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden><path d="m3 3 10 10M13 3 3 13" /></svg>
          </button>
        </div>

        <div className="px-3 pt-2 pb-1.5">
          <button
            type="button"
            disabled
            title="Shared libraries are not connected in field yet"
            className="w-full h-7 px-2 flex items-center justify-between rounded-[7px] text-xs text-[var(--text-secondary)] bg-[var(--grid-line)] border border-[var(--control-border)] cursor-default"
          >
            <span>All libraries</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden><path d="M2.3 3.7 5 6.3l2.7-2.6" /></svg>
          </button>
        </div>

        <div className="px-3 pb-2 border-b border-[var(--border-light)]">
          <label className="h-8 px-2 flex items-center gap-2 rounded-[7px] bg-[var(--grid-line)] border border-[var(--control-border)] focus-within:border-[var(--border-focus)]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.15" className="text-[var(--text-secondary)]" aria-hidden><circle cx="7" cy="7" r="4.2" /><path d="m10.2 10.2 3 3" /></svg>
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search styles"
              className="min-w-0 flex-1 bg-transparent border-0 outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-disabled)]"
            />
          </label>
        </div>

        <div className="max-h-[328px] overflow-y-auto py-1.5" style={{ scrollbarWidth: 'thin' }}>
          {visibleTokens.length === 0 ? (
            <div className="px-3 py-3 text-xs text-[var(--text-disabled)]">No matching styles</div>
          ) : (
            visibleTokens.map((token) => (
              <button
                key={token.name}
                onClick={() => handleSelect(token.name)}
                className="group w-[calc(100%-12px)] h-8 mx-1.5 px-2.5 flex items-center gap-2 rounded-[7px] text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                {token.category === 'color' && (
                  <span className="w-4 h-4 rounded-[3px] border border-[var(--control-border)] flex-shrink-0" style={{ backgroundColor: token.value }} />
                )}
                <span className="min-w-0 flex-1 text-xs truncate">{token.label || token.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </ToolPopup>
  );
}
