// FontFamilyPopup.tsx -- Font family picker using react-window v2 List.
// FIGUI3_CORRECTIVE_FONT_BROWSER_20260925
// Opens inside a ToolPopup. Shows search, source/category filtering, and a virtualised font list.
// Family names are the preview; symbol/icon families fall back to field UI type for legibility.

import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useSetAtom } from 'jotai';
import { List, useListRef, type RowComponentProps } from 'react-window';
import { fetchGoogleFonts, DEFAULT_FONTS, FEELING_CATEGORIES, type FontItem } from '@/shared/google-fonts';
import { loadGoogleFont, loadFontFromCSSValue, loadCustomFont } from '@/shared/font-loader';
import { useWorkspaceFonts, ensureWorkspaceFonts, applyWorkspaceFontToProject } from '@/code/stores/workspace-fonts-store';
import type { WorkspaceFont } from '@/backend/types';
import ToolPopup from './ToolPopup';
import { suppressSelectionOverlayAtom } from '@/code/stores/editor-store';
import { trace } from '@/shared/debug-trace';

interface FontFamilyPopupProps {
  value: string;
  onChange: (family: string) => void;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Render inline (no ToolPopup wrapper) — for use inside pushPanel */
  inline?: boolean;
  /** Compact quick-family surface: reuse browser data/rows, omit source/category filtering and shorten the list. */
  compact?: boolean;
  /** Hover preview — called with the CSS family value when the user hovers
   *  a row, and `null` when the cursor leaves it (or when the popup
   *  closes / a font is selected). The control wires this into either a
   *  scoped `injectCanvasCSS` rule (whole-element preview) or a TipTap
   *  fontFamily write (selected-text-portion preview), then reverts on
   *  unhover so nothing commits to the user's code unless they click. */
  onPreview?: (family: string | null) => void;
}

type FontFilter = 'all' | 'workspace' | 'google' | `tag:${string}`;

const SYMBOL_FONT_FAMILY_RE = /^(?:Material (?:Symbols|Icons)|Noto (?:Color )?Emoji)\b/i;

export function shouldRenderFontNameWithUiFace(family: string): boolean {
  return SYMBOL_FONT_FAMILY_RE.test(family.trim());
}

function SelectedCheck({ selected }: { selected: boolean }) {
  return (
    <span
      data-font-selected-check
      aria-hidden
      className="w-5 shrink-0 flex items-center justify-center text-[var(--text-primary)]"
    >
      {selected && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2.2 6.1 2.2 2.2 5.2-5.2" />
        </svg>
      )}
    </span>
  );
}

/** Extra props passed to each row via rowProps (react-window v2 injects index+style automatically) */
interface FontRowExtraProps {
  filteredFonts: FontItem[];
  currentFontName: string;
  onSelect: (font: FontItem) => void;
  onPreview?: (family: string | null) => void;
}

/** Row component for react-window v2 */
function FontRow({ index, style, filteredFonts, currentFontName, onSelect, onPreview }: RowComponentProps<FontRowExtraProps>) {
  const font = filteredFonts[index];
  if (!font) return null;

  const isSelected = font.family === currentFontName;
  // Load font when visible in virtualised list
  loadGoogleFont(font.family);
  // Same shape the parent ends up writing on commit — keep the hover
  // preview value consistent with that so the canvas doesn't visibly
  // shift between "previewing" and "selected" for the same row.
  const cssFamily = font.category ? `${font.family}, ${font.category}` : font.family;

  return (
    <div
      style={{ ...style, padding: '1px 0' }}
      onClick={() => onSelect(font)}
      onMouseDown={e => e.stopPropagation()}
      // Only fire ENTER per row. The container below has a single
      // mouseleave that reverts the preview when the cursor truly
      // exits the popup. Per-row mouseleave + the next row's
      // mouseenter race against the async TipTap mark write — the
      // restore-from-snapshot in between can land AFTER the next
      // hover's write, leaving the canvas pinned to the original
      // value mid-hover (visible as "stays stale, doesn't change").
      // Pickers in Figma / VS Code use the same "preview persists
      // until you move OFF the picker" idiom anyway.
      onMouseEnter={() => onPreview?.(cssFamily)}
    >
      <div
        className={`h-7 flex items-center px-1.5 rounded-[3px] cursor-pointer transition-colors ${
          isSelected
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
        }`}
        style={{ fontFamily: shouldRenderFontNameWithUiFace(font.family) ? 'var(--loew-ui-font)' : `"${font.family}", var(--loew-ui-font)` }}
      >
        <SelectedCheck selected={isSelected} />
        <span className="text-[11px] leading-none truncate min-w-0">{font.family}</span>
      </div>
    </div>
  );
}

export default function FontFamilyPopup({ value, onChange, isOpen, onClose, anchorRef, inline, compact = false, onPreview }: FontFamilyPopupProps) {
  const [fonts, setFonts] = useState<FontItem[]>(DEFAULT_FONTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FontFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMenuPos, setFilterMenuPos] = useState({ left: 0, top: 0 });
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useListRef(null);
  const setSuppressOverlay = useSetAtom(suppressSelectionOverlayAtom);
  const workspaceFonts = useWorkspaceFonts();

  // Hide the canvas SelectionOverlay while the picker is open. Hover
  // preview rapidly mutates the selected text's font, but the overlay's
  // RAF poll lags one frame and the box border ends up overflowing /
  // undershooting the new text bounds — visible as the outline drifting
  // off the text.
  //
  // Un-suppress on close has to wait for the iframe's NEXT render to
  // complete — the commit path (`onChange` → mutation queue → flush →
  // renderer rebuild → bridge `allRects` → parent `rectCache`) is
  // asynchronous, so painting the overlay the moment `isOpen` flips false
  // would read the bridge's STALE rect (still the previous font's
  // metrics) for one frame, then snap to the correct rect on the next
  // RAF tick. The user sees this as a visible "jump". Listening for
  // `revyme:render-complete` (dispatched from `Renderer.ts` after every
  // render cycle) guarantees the rectCache is fresh before the overlay
  // re-appears. A 250ms safety timeout falls back in case the event
  // doesn't fire (e.g. user closed via Esc with no actual change).
  useEffect(() => {
    if (!isOpen) return;
    setSuppressOverlay(true);
    return () => {
      let restored = false;
      const restore = () => {
        if (restored) return;
        restored = true;
        window.removeEventListener('revyme:render-complete', restore);
        clearTimeout(timeout);
        setSuppressOverlay(false);
      };
      window.addEventListener('revyme:render-complete', restore);
      const timeout = setTimeout(restore, 250);
    };
  }, [isOpen, setSuppressOverlay]);

  // Fetch Google Fonts on first open
  useEffect(() => {
    if (!isOpen) return;

    if (fonts !== DEFAULT_FONTS && fonts.length > DEFAULT_FONTS.length) return; // already fetched

    setLoading(true);
    trace.action('font-popup:fetch-start', {});

    fetchGoogleFonts()
      .then(result => {
        setFonts(result);
        trace.action('font-popup:fetch-done', { count: result.length });
      })
      .finally(() => setLoading(false));
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load current font on open
  useEffect(() => {
    if (isOpen && value) loadFontFromCSSValue(value);
  }, [isOpen, value]);

  // Reset search/filter when popup closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedFilter('all');
      setFilterOpen(false);
    }
  }, [isOpen]);

  // Filter Google fonts by source/tag + search. Workspace source selection
  // intentionally empties this list; workspace families are rendered by the
  // dedicated section below without sacrificing Google-list virtualization.
  const filteredFonts = useMemo(() => {
    if (selectedFilter === 'workspace') return [] as FontItem[];

    let filtered = fonts;
    if (selectedFilter.startsWith('tag:')) {
      const category = selectedFilter.slice(4).toLowerCase();
      filtered = filtered.filter(font => {
        if (!font.tags || !Array.isArray(font.tags)) return false;
        return font.tags.some(tag => {
          const tagName = typeof tag === 'string' ? tag : tag?.name;
          return typeof tagName === 'string' && tagName.toLowerCase().includes(category);
        });
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(font => font.family.toLowerCase().includes(query));
    }

    return filtered;
  }, [fonts, searchQuery, selectedFilter]);

  // Fetch the workspace font library the first time the picker opens.
  useEffect(() => {
    if (isOpen) ensureWorkspaceFonts();
  }, [isOpen]);

  // Workspace fonts → one representative entry per family (prefer the
  // closest-to-Regular upright weight). Source/category filtering is unified
  // with the Google catalog: Workspace is visible for all/workspace, hidden
  // for Google-only and feeling/tag filters.
  const workspaceFamilies = useMemo(() => {
    if (selectedFilter === 'google' || selectedFilter.startsWith('tag:')) return [] as WorkspaceFont[];
    const rep = new Map<string, WorkspaceFont>();
    for (const f of workspaceFonts) {
      const cur = rep.get(f.family);
      if (!cur) { rep.set(f.family, f); continue; }
      const better =
        (f.style === 'normal' && cur.style !== 'normal') ||
        (f.style === cur.style && Math.abs(f.weight - 400) < Math.abs(cur.weight - 400));
      if (better) rep.set(f.family, f);
    }
    let arr = Array.from(rep.values());
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(f => f.family.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => a.family.localeCompare(b.family));
  }, [workspaceFonts, searchQuery, selectedFilter]);

  // Current font name for highlighting. CRITICAL: frozen to the value at
  // popup-open time, NOT the live `value` prop. Why:
  //
  // In text-portion preview mode (TipTap selection active), each hover
  // writes the previewed font as a TipTap mark on the selected text.
  // That mark flows back through the snapshot atom → useTextStyles →
  // `value` prop. If we derive the highlight from the live `value`, every
  // hover makes the popup highlight a NEW row — the one the user is
  // hovering. The user perceives "I just hovered Concert One and the
  // popup says it's now selected" — clicks and hovers feel
  // indistinguishable.
  //
  // The "real" selected font (what's committed on click) is what the
  // popup OPENED with. Freeze it here so the highlight stays anchored.
  // Re-snapshot when the popup re-opens. Whole-element mode doesn't hit
  // this loop (its preview path uses injectCanvasCSS, not a value write),
  // but using the same freeze for both modes keeps the UX consistent.
  const [frozenValue, setFrozenValue] = useState<string>('');
  useEffect(() => {
    if (isOpen) setFrozenValue(value);
    else setFrozenValue('');
    // Snapshot ONLY on open transition — `value` changes during preview
    // are exactly what we want to ignore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const currentFontName = (frozenValue || value)?.split(',')[0]?.trim().replace(/['"]/g, '') || '';

  // Auto-scroll to selected font ONCE per open. Re-scrolling on every
  // `value` change drives a feedback loop with the hover-preview path:
  // hover row → preview writes new value → effect re-fires → list scrolls
  // → cursor lands on a different row → that row's onMouseEnter fires →
  // preview writes again → repeat. The user sees the popup self-scroll
  // and the canvas font cycle wildly. The guard pins scroll to "happens
  // when the popup opens / filter changes", not "happens whenever the
  // active font value changes". Reset on close so the next open scrolls
  // again to wherever the user committed last.
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      didInitialScrollRef.current = false;
      return;
    }
    if (didInitialScrollRef.current) return;
    if (!listRef.current || filteredFonts.length === 0 || !value) return;

    const idx = filteredFonts.findIndex(f =>
      f.family === currentFontName || value.includes(f.family)
    );

    if (idx !== -1) {
      didInitialScrollRef.current = true;
      setTimeout(() => {
        listRef.current?.scrollToRow({ index: idx, align: 'center' });
      }, 100);
    }
    // `value` intentionally excluded from deps — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filteredFonts, currentFontName, listRef]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleFontSelect = useCallback((font: FontItem) => {
    trace.action('font-popup:select', { family: font.family, category: font.category });
    loadGoogleFont(font.family);
    const fontValue = font.category ? `${font.family}, ${font.category}` : font.family;
    // Clear any active hover preview before committing — onChange writes
    // the selected family, but the parent's preview state may still hold
    // a reference to the previously-hovered row that would otherwise be
    // restored on the next mouseleave.
    onPreview?.(null);
    onChange(fontValue);
    onClose();
  }, [onChange, onClose, onPreview]);

  const handleWorkspaceSelect = useCallback((font: WorkspaceFont) => {
    trace.action('font-popup:select-workspace', { family: font.family });
    loadCustomFont({ family: font.family, url: font.url, weight: font.weight, style: font.style });
    // Match the Google path's `Family, fallback` shape so the committed value
    // and the highlight (which strips the fallback) line up.
    const fontValue = `${font.family}, sans-serif`;
    onPreview?.(null);
    onChange(fontValue);
    // Declare the @font-face in the project (globals.css) so the canvas iframe
    // resolves it and it ships on publish — runs after onChange so the queued
    // fontFamily write flushes first.
    applyWorkspaceFontToProject(font.family);
    onClose();
  }, [onChange, onClose, onPreview]);

  // Cancel any in-flight preview when the popup closes (Escape, outside
  // click, or programmatic close). Without this, mousing OUT of a row
  // and immediately closing leaves the canvas pinned at the preview
  // family with no way to revert.
  useEffect(() => {
    if (!isOpen) onPreview?.(null);
  }, [isOpen, onPreview]);

  const filterLabel = selectedFilter === 'all'
    ? 'All fonts'
    : selectedFilter === 'workspace'
      ? 'Workspace fonts'
      : selectedFilter === 'google'
        ? 'Google Fonts'
        : selectedFilter.slice(4);

  const toggleFilterMenu = useCallback(() => {
    if (filterOpen) {
      setFilterOpen(false);
      return;
    }
    const rect = filterButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 184;
    const pad = 8;
    const estimatedHeight = 320;
    const left = Math.min(Math.max(pad, rect.left), Math.max(pad, window.innerWidth - width - pad));
    const below = rect.bottom + 4;
    const top = below + estimatedHeight <= window.innerHeight - pad
      ? below
      : Math.max(pad, rect.top - estimatedHeight - 4);
    setFilterMenuPos({ left, top });
    setFilterOpen(true);
  }, [filterOpen]);

  const chooseFilter = useCallback((next: FontFilter) => {
    didInitialScrollRef.current = false;
    setSelectedFilter(next);
    setFilterOpen(false);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (filterButtonRef.current?.contains(target) || target.closest('[data-font-filter-menu]')) return;
      setFilterOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setFilterOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [filterOpen]);

  // Row props for react-window v2
  const rowProps: FontRowExtraProps = useMemo(() => ({
    filteredFonts,
    currentFontName,
    onSelect: handleFontSelect,
    onPreview,
  }), [filteredFonts, currentFontName, handleFontSelect, onPreview]);

  // Container-level mouseleave fires once when the cursor truly exits
  // the popup (NOT when transitioning between rows — those are nested,
  // their leave/enter cancel out with `relatedTarget` still inside).
  // This is the single revert point for the hover preview.
  const handleContainerLeave = useCallback(() => {
    onPreview?.(null);
  }, [onPreview]);

  const noResults = workspaceFamilies.length === 0 && filteredFonts.length === 0;

  const content = (
    <>
      <div onMouseLeave={handleContainerLeave}>
        <div className={`flex flex-col gap-1 ${inline ? '' : '-mx-2.5 px-2.5'} pb-1.5 border-b border-[var(--border-light)]`}>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full h-7 bg-[var(--control-bg)] rounded-[3px] border border-transparent pl-7 pr-2 py-0 text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--selection)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              placeholder="Search fonts…"
            />
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-secondary)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
{!compact && (
          <button
            ref={filterButtonRef}
            type="button"
            data-font-filter-trigger
            aria-haspopup="menu"
            aria-expanded={filterOpen}
            onClick={toggleFilterMenu}
            className="h-7 w-full px-2 flex items-center justify-between rounded-[3px] border border-transparent bg-transparent hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--selection)]"
          >
            <span className="truncate">{filterLabel}</span>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="shrink-0 text-[var(--text-secondary)]">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>
          )}
        </div>

        <div className="-mx-2.5 px-1 pt-1">
          {workspaceFamilies.length > 0 && (
            <div className="mb-0.5">
              <div className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">
                Workspace fonts
              </div>
              <div className={compact ? 'max-h-[84px] overflow-y-auto [&::-webkit-scrollbar]:hidden' : selectedFilter === 'workspace' ? 'max-h-[286px] overflow-y-auto [&::-webkit-scrollbar]:hidden' : 'max-h-[112px] overflow-y-auto [&::-webkit-scrollbar]:hidden'}>
                {workspaceFamilies.map(font => {
                  const isSelected = font.family === currentFontName;
                  const cssFamily = `${font.family}, sans-serif`;
                  return (
                    <div
                      key={font.id}
                      className="h-7"
                      onClick={() => handleWorkspaceSelect(font)}
                      onMouseDown={e => e.stopPropagation()}
                      onMouseEnter={() => onPreview?.(cssFamily)}
                    >
                      <div
                        className={`h-7 flex items-center px-1.5 rounded-[3px] cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                            : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                        }`}
                        style={{ fontFamily: shouldRenderFontNameWithUiFace(font.family) ? 'var(--loew-ui-font)' : `"${font.family}", var(--loew-ui-font)` }}
                      >
                        <SelectedCheck selected={isSelected} />
                        <span className="text-[11px] leading-none truncate min-w-0">{font.family}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedFilter === 'all' && workspaceFamilies.length > 0 && filteredFonts.length > 0 && (
            <div className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)] border-t border-[var(--border-light)]">
              Google Fonts
            </div>
          )}

          {loading && selectedFilter !== 'workspace' ? (
            <div className="flex items-center justify-center h-28">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--text-secondary)]" />
            </div>
          ) : noResults ? (
            <div className="flex items-center justify-center h-28 text-[var(--text-secondary)] text-[11px]">
              {selectedFilter === 'workspace' ? 'No workspace fonts' : 'No fonts found'}
            </div>
          ) : filteredFonts.length > 0 ? (
            <List
              listRef={listRef}
              rowCount={filteredFonts.length}
              rowHeight={28}
              rowComponent={FontRow}
              rowProps={rowProps}
              style={{ height: compact ? (workspaceFamilies.length > 0 ? 132 : 196) : (workspaceFamilies.length > 0 ? 174 : 294), scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
              className="[&::-webkit-scrollbar]:hidden"
            />
          ) : null}
        </div>
      </div>

      {filterOpen && createPortal(
        <div
          data-font-filter-menu
          data-field-no-canvas-input
          role="menu"
          aria-label="Font filter"
          className="fixed w-[184px] max-h-[320px] overflow-y-auto py-1 rounded-[5px] border border-[var(--border-light)] bg-[var(--dropdown-bg)] shadow-[var(--shadow-lg)] scrollbar-hide"
          style={{ left: filterMenuPos.left, top: filterMenuPos.top, zIndex: 100020 }}
          onMouseDown={(event) => event.stopPropagation()}
          onWheelCapture={(event) => event.stopPropagation()}
        >
          {([
            ['all', 'All fonts'],
            ['workspace', 'Workspace fonts'],
            ['google', 'Google Fonts'],
          ] as const).map(([filter, label]) => (
            <button
              key={filter}
              type="button"
              role="menuitemradio"
              aria-checked={selectedFilter === filter}
              onClick={() => chooseFilter(filter)}
              className={`h-7 w-full px-1.5 flex items-center rounded-[3px] text-left text-[11px] ${
                selectedFilter === filter ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
              }`}
            >
              <SelectedCheck selected={selectedFilter === filter} />
              <span className="truncate">{label}</span>
            </button>
          ))}
          <div className="h-px bg-[var(--border-light)] my-1 mx-2" />
          {FEELING_CATEGORIES.filter(category => category !== 'All').map(category => {
            const filter = `tag:${category}` as FontFilter;
            return (
              <button
                key={category}
                type="button"
                role="menuitemradio"
                aria-checked={selectedFilter === filter}
                onClick={() => chooseFilter(filter)}
                className={`h-7 w-full px-1.5 flex items-center rounded-[3px] text-left text-[11px] ${
                  selectedFilter === filter ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
                }`}
              >
                <SelectedCheck selected={selectedFilter === filter} />
                <span className="truncate">{category}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );

  if (inline) return content;

  return (
    <ToolPopup isOpen={isOpen} onClose={onClose} title="Fonts" anchorRef={anchorRef} width={276}>
      {content}
    </ToolPopup>
  );
}
