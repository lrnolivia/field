// DropdownMenu.tsx — Centralized dropdown menu matching context menu design.
// FIGUI3_SIDEBAR_DROPDOWN_20260925
// FIELD_SCROLL_INTEGRITY_DROPDOWN_20260925
// FIELD_INSPECTOR_COMMAND_MENU_006
// Used for: Components +, Pages +, toolbar dropdowns, any popup menu.
// Configurable hover accent: blue (context menu) or subtle gray (panel menus).
//
// Cascading submenus:
//   Items can carry `submenuItems`. Hovering such an item opens a SECOND
//   menu portal positioned to the right (or left if there's no room) and
//   top-aligned with the item. Submenus can themselves contain submenus
//   (the menu structure is recursive). Hover state persists while the
//   cursor moves between parent item and submenu so the user can navigate
//   without closing accidentally.

import { useRef, useEffect, useLayoutEffect, useState, useMemo, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FIELD_SURFACE_Z, fieldSurfaceScopeFor, fieldSurfaceZ } from '@/shared/field-surface-elevation';

export interface DropdownMenuItem {
  id: string;
  label: string;
  /** Optional native tooltip for disabled or explanatory commands. */
  title?: string;
  icon?: ReactNode;
  /** Right-side icon — rendered between the label and the shortcut.
   *  Used by the Preferences submenu's check glyph so it sits at the
   *  END of the row (the leading `icon` slot would put it on the left
   *  and the row layout looks unbalanced for boolean toggles). */
  trailingIcon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  /** Accent-coloured label — for a single promoted row in an otherwise
   *  neutral menu (e.g. "Upgrade your plan"). Uses --accent-text, the tone
   *  tuned to be READABLE on a panel, not the fill colour. */
  accent?: boolean;
  /** Cascading submenu — opens to the right on hover. Recursive. */
  submenuItems?: DropdownMenuEntry[];
  /** Force-render a right chevron next to the label. Auto-rendered when
   *  `submenuItems` is set; this flag is only needed for parent items
   *  whose submenu lives in a custom rendering (older state-machine path
   *  — kept for backward compat). */
  hasSubmenu?: boolean;
  /** When true the menu does NOT auto-close after onClick. Mostly useful
   *  for legacy state-machine flows; cascading submenus don't need it
   *  because parent items don't run onClick at all (hover opens submenu). */
  keepOpen?: boolean;
  onClick: () => void;
}

interface DropdownMenuSeparator {
  type: 'separator';
}

export type DropdownMenuEntry = DropdownMenuItem | DropdownMenuSeparator;

function isSeparator(entry: DropdownMenuEntry): entry is DropdownMenuSeparator {
  return 'type' in entry && entry.type === 'separator';
}

/** Collapse runs of separators into one and drop leading/trailing ones.
 *  Menus often build entries like `[…, sep, ...maybeEmptyGroup, sep, delete]`
 *  where a conditionally-empty group (e.g. "Move to folder…" with no folders)
 *  leaves two separators adjacent — rendering a double divider. Normalizing
 *  here fixes it for EVERY menu in one place. */
export function normalizeSeparators(items: DropdownMenuEntry[]): DropdownMenuEntry[] {
  const out: DropdownMenuEntry[] = [];
  for (const entry of items) {
    // Skip a separator that would be leading or directly follow another.
    if (isSeparator(entry) && (out.length === 0 || isSeparator(out[out.length - 1]))) continue;
    out.push(entry);
  }
  while (out.length > 0 && isSeparator(out[out.length - 1])) out.pop(); // drop trailing
  return out;
}

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: DropdownMenuEntry[];
  /** Anchor element for positioning. Optional when `anchorPoint` is given. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** Viewport-coordinate anchor POINT (e.g. a right-click cursor position).
   *  When set, positioning uses this 0×0 point INSTEAD of anchorRef's rect.
   *  Pass raw clientX/clientY — the menu portals to document.body, so the
   *  coords are never re-based by a transformed/will-change ancestor the
   *  way a `position: fixed` virtual-anchor div inside a panel is (the
   *  left panels carry `willChange: 'transform'`, which makes them the
   *  containing block for fixed descendants and shifted context menus by
   *  the panel's own top/left). */
  anchorPoint?: { x: number; y: number } | null;
  /** Position relative to anchor. `right-start` opens BESIDE the anchor
   *  (to its right, top edges aligned) instead of below it. */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'right-start';
  /** Minimum width */
  minWidth?: number;
  /** Make the menu exactly as wide as its anchor, and ELLIPSIZE labels that do
   *  not fit. Menus size to their longest label by default, which is right for
   *  a list of commands and wrong for a list of user-written titles in a
   *  narrow panel: one long chat name made the menu spill out of the panel it
   *  belongs to. Opt-in — every other menu keeps sizing to content. */
  matchAnchorWidth?: boolean;
  /** Hover style: 'accent' (blue highlight, like context menu) or 'subtle' (gray) */
  hoverStyle?: 'accent' | 'subtle';
  /** Render a "Type to search…" row at the top of the ROOT menu. Typing
   *  opens a results flyout to the right combining every matching leaf
   *  from the whole submenu tree; hovering a real item swaps the flyout
   *  for that item's normal submenu. Submenus never get the search row. */
  searchable?: boolean;
  /** Compact command-menu density. Opt-in so existing dropdowns retain
   *  their current touch targets; used by the project/title menu. */
  density?: 'default' | 'compact';
  /** Optional enabled item id to receive initial keyboard focus when an
   *  ordinary trigger-anchored menu opens. Falls back to the first enabled row. */
  preferredFocusItemId?: string;
}

/** Recursively collect ENABLED leaf items (no submenu) whose label matches
 *  the query, depth-first so results follow the menu's visual order.
 *  Exported for tests. */
export function collectMatchingLeaves(
  entries: DropdownMenuEntry[],
  query: string,
  out: DropdownMenuItem[] = [],
  seen: Set<string> = new Set(),
): DropdownMenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return out;
  for (const entry of entries) {
    if (isSeparator(entry)) continue;
    if (entry.submenuItems && entry.submenuItems.length > 0) {
      collectMatchingLeaves(entry.submenuItems, query, out, seen);
      continue;
    }
    if (entry.disabled || seen.has(entry.id)) continue;
    if (entry.label.toLowerCase().includes(q)) {
      seen.add(entry.id);
      out.push(entry);
    }
  }
  return out;
}

// ─── Position helpers ──────────────────────────────────────────────────────

const VIEWPORT_PADDING = 8;
const SUBMENU_GAP = 10;
const ESTIMATED_ITEM_HEIGHT = 32;

/** Pick (x, y) for a submenu opening to the right of `parentRect`,
 *  flipping left when there's no room. Top-aligned with the parent item;
 *  shifts upward if the submenu would overflow the viewport bottom. */
function chooseSubmenuPosition(
  parentRect: DOMRect,
  panelWidth: number,
  itemCount: number,
): { left: number; top: number } {
  const panelHeight = Math.min(itemCount * ESTIMATED_ITEM_HEIGHT + 16, 360);

  // X: prefer right of the parent item, fall back to left.
  let left = parentRect.right + SUBMENU_GAP;
  if (left + panelWidth > window.innerWidth - VIEWPORT_PADDING) {
    left = parentRect.left - panelWidth - SUBMENU_GAP;
  }
  if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;

  // Y: top-align with the parent item, flip up if it would overflow.
  let top = parentRect.top;
  if (top + panelHeight > window.innerHeight - VIEWPORT_PADDING) {
    top = parentRect.bottom - panelHeight;
  }
  if (top < VIEWPORT_PADDING) top = VIEWPORT_PADDING;

  return { left, top };
}

// ─── Inner renderer (shared between root menu + submenus) ──────────────────

interface MenuPanelProps {
  items: DropdownMenuEntry[];
  hoverStyle: 'accent' | 'subtle';
  minWidth?: number;
  /** Fixed width (root menu, `matchAnchorWidth`). Labels ellipsize inside it. */
  width?: number;
  onClose: () => void;
  /** Inline style for absolute/fixed placement. */
  style: React.CSSProperties;
  /** Optional ref forwarded to the root panel `<div>` so the parent
   *  can measure it for viewport clamping. Submenus don't supply
   *  this — they self-position via `chooseSubmenuPosition`. */
  rootRef?: React.RefObject<HTMLDivElement | null>;
  /** Root menu only — renders the "Type to search…" row. */
  searchable?: boolean;
  /** Root menu density; cascading submenus keep default density. */
  density?: 'default' | 'compact';
  /** Move keyboard focus into the menu when it mounts. */
  autoFocusFirst?: boolean;
  /** Preferred initial item; disabled/missing ids fall back to first enabled. */
  preferredFocusItemId?: string;
  /** Submenus use Left Arrow to close themselves and restore parent focus. */
  onArrowLeft?: () => void;
  /** Explicit floating-surface z-index resolved by the root/submenu owner. */
  zIndex?: number;
}

/** Sentinel `openSubId` value for the search-results flyout. It shares the
 *  one-submenu-at-a-time slot with real item submenus, which gives the
 *  desired interplay for free: hovering a real item replaces the results
 *  flyout with that item's normal submenu. */
const SEARCH_SUB_ID = '__search__';

function MenuPanel({
  items, hoverStyle, minWidth, width, onClose, style, rootRef, searchable,
  density = 'default', autoFocusFirst = false, preferredFocusItemId, onArrowLeft,
  zIndex = FIELD_SURFACE_Z.menu,
}: MenuPanelProps) {
  const compact = density === 'compact';
  const [openSubId, setOpenSubId] = useState<string | null>(null);
  const [keyboardSubId, setKeyboardSubId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Search remains the primary focus target for searchable root menus.
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchResults = useMemo(
    () => (searchable && query.trim() ? collectMatchingLeaves(items, query) : []),
    [searchable, items, query],
  );
  const normalizedItems = useMemo(() => normalizeSeparators(items), [items]);
  const navigableItems = useMemo(
    () => normalizedItems.filter((entry): entry is DropdownMenuItem => !isSeparator(entry) && !entry.disabled),
    [normalizedItems],
  );
  const didInitialFocus = useRef(false);

  const focusItem = (id: string | undefined) => {
    if (!id) return;
    itemRefs.current.get(id)?.focus();
  };

  const focusByOffset = (currentId: string | undefined, offset: number) => {
    if (navigableItems.length === 0) return;
    const currentIndex = currentId ? navigableItems.findIndex(item => item.id === currentId) : -1;
    const baseIndex = currentIndex >= 0 ? currentIndex : (offset > 0 ? -1 : 0);
    const nextIndex = (baseIndex + offset + navigableItems.length) % navigableItems.length;
    focusItem(navigableItems[nextIndex]?.id);
  };

  useLayoutEffect(() => {
    if (didInitialFocus.current) return;
    if (searchable) {
      searchInputRef.current?.focus();
      didInitialFocus.current = true;
      return;
    }
    if (!autoFocusFirst || navigableItems.length === 0) return;
    const preferred = preferredFocusItemId
      ? navigableItems.find(item => item.id === preferredFocusItemId)
      : undefined;
    focusItem((preferred ?? navigableItems[0])?.id);
    didInitialFocus.current = true;
  }, [autoFocusFirst, navigableItems, preferredFocusItemId, searchable]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      // Do not trap Tab. Closing lets normal browser focus traversal continue.
      onClose();
      return;
    }

    const target = event.target as HTMLElement;
    if (target === searchInputRef.current) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setOpenSubId(null);
        setKeyboardSubId(null);
        focusItem(event.key === 'ArrowDown'
          ? navigableItems[0]?.id
          : navigableItems[navigableItems.length - 1]?.id);
      }
      return;
    }

    const button = target.closest<HTMLButtonElement>('[data-dropdown-menu-item-id]');
    if (!button || !panelRef.current?.contains(button)) return;
    const currentId = button.dataset.dropdownMenuItemId;
    const currentEntry = normalizedItems.find(entry => !isSeparator(entry) && entry.id === currentId);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      focusByOffset(currentId, 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      focusByOffset(currentId, -1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      event.stopPropagation();
      focusItem(navigableItems[0]?.id);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      event.stopPropagation();
      focusItem(navigableItems[navigableItems.length - 1]?.id);
      return;
    }
    if (event.key === 'ArrowRight' && currentEntry && !isSeparator(currentEntry) && currentEntry.submenuItems?.length) {
      event.preventDefault();
      event.stopPropagation();
      setOpenSubId(currentEntry.id);
      setKeyboardSubId(currentEntry.id);
      return;
    }
    if (event.key === 'ArrowLeft' && onArrowLeft) {
      event.preventDefault();
      event.stopPropagation();
      onArrowLeft();
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && !button.disabled) {
      event.preventDefault();
      event.stopPropagation();
      button.click();
    }
  };

  const itemHoverClass = hoverStyle === 'accent'
    ? 'hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]'
    : 'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';

  return (
    <div
      ref={(el) => {
        panelRef.current = el;
        if (rootRef) rootRef.current = el;
      }}
      data-field-no-canvas-input
      data-scroll-surface="dropdown-menu"
      role="menu"
      aria-orientation="vertical"
      onKeyDown={handleKeyDown}
      onWheel={(event) => event.stopPropagation()}
      className="fixed rounded-[8px] bg-[var(--dropdown-bg,var(--bg-surface))] border border-[var(--border-light)]"
      style={{
        ...style,
        ...(width ? { width, minWidth: 0 } : { minWidth }),
        whiteSpace: 'nowrap',
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        rowGap: compact ? 0 : 2,
        paddingTop: compact ? 5 : 8,
        paddingBottom: compact ? 5 : 8,
        maxHeight: 'min(360px, calc(100dvh - 16px))',
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'contain',
      }}
    >
      {searchable && (
        <>
          <div className="flex items-center gap-2 mx-1.5 px-2 h-8">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--text-secondary)]">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                setOpenSubId(v.trim() ? SEARCH_SUB_ID : null);
                setKeyboardSubId(null);
              }}
              placeholder="Type to search..."
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
            />
          </div>
          <div role="separator" className="h-px bg-white/10 mx-2 my-1" />
        </>
      )}

      {searchable && openSubId === SEARCH_SUB_ID && searchResults.length > 0 && createPortal(
        <CascadingSubmenu
          parentEl={panelRef.current}
          items={searchResults}
          hoverStyle={hoverStyle}
          onClose={onClose}
          onMouseLeavePanel={() => {}}
        />,
        document.body,
      )}

      {normalizedItems.map((entry, i) => {
        if (isSeparator(entry)) {
          return <div key={`sep-${i}`} role="separator" className={`h-px bg-white/10 mx-2 ${compact ? 'my-0.5' : 'my-1'}`} />;
        }

        const hasSubmenu = (entry.submenuItems && entry.submenuItems.length > 0) || entry.hasSubmenu;
        const isOpen = openSubId === entry.id;
        const accentFilled = isOpen && !entry.danger && !entry.disabled && hoverStyle === 'accent';

        return (
          <div key={entry.id} className="relative">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              data-dropdown-menu-item-id={entry.id}
              aria-disabled={entry.disabled || undefined}
              aria-haspopup={hasSubmenu ? 'menu' : undefined}
              aria-expanded={hasSubmenu ? isOpen : undefined}
              title={entry.title}
              ref={(el) => {
                if (el) itemRefs.current.set(entry.id, el);
                else itemRefs.current.delete(entry.id);
              }}
              onMouseEnter={() => {
                setKeyboardSubId(null);
                if (entry.disabled) return;
                if (entry.submenuItems && entry.submenuItems.length > 0) {
                  setOpenSubId(entry.id);
                } else {
                  setOpenSubId(null);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (entry.submenuItems && entry.submenuItems.length > 0) return;
                entry.onClick();
                if (!entry.keepOpen) onClose();
              }}
              disabled={entry.disabled}
              className={`
                group flex items-center gap-3 mx-1.5 px-2 ${compact ? 'h-7' : 'h-8'}
                w-[calc(100%-12px)] rounded-[5px]
                text-xs
                ${entry.disabled
                  ? 'opacity-40 cursor-default text-[var(--text-primary)]'
                  : entry.danger
                    ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300 cursor-pointer'
                    : entry.accent
                      ? `${accentFilled ? '' : 'text-[var(--accent-text)]'} font-semibold ${itemHoverClass} cursor-pointer`
                      : `${accentFilled ? '' : 'text-[var(--text-primary)]'} ${itemHoverClass} cursor-pointer`
                }
                ${isOpen && !entry.danger && !entry.disabled
                  ? (hoverStyle === 'accent' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'bg-[var(--bg-hover)]')
                  : ''
                }
                ${entry.disabled ? '' : 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--selection,var(--accent))]'}
              `}
            >
              {entry.icon && <span className="shrink-0 w-4 flex items-center justify-center opacity-80 group-hover:opacity-100">{entry.icon}</span>}
              <span className={`flex-1 text-left font-medium ${width ? 'min-w-0 truncate' : ''}`} title={width ? entry.label : undefined}>{entry.label}</span>
              {entry.trailingIcon && <span className="shrink-0 min-w-4 flex items-center justify-center opacity-90 group-hover:opacity-100">{entry.trailingIcon}</span>}
              {entry.shortcut && <span className="text-[10px] text-[var(--text-secondary)] group-hover:text-[var(--accent-fg)]/70">{entry.shortcut}</span>}
              {hasSubmenu && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70 group-hover:opacity-100">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>

            {entry.submenuItems && entry.submenuItems.length > 0 && isOpen && createPortal(
              <CascadingSubmenu
                parentEl={itemRefs.current.get(entry.id) ?? null}
                items={entry.submenuItems}
                hoverStyle={hoverStyle}
                onClose={onClose}
                onMouseLeavePanel={() => { setOpenSubId(null); setKeyboardSubId(null); }}
                keyboardOpen={keyboardSubId === entry.id}
                onKeyboardClose={() => {
                  setOpenSubId(null);
                  setKeyboardSubId(null);
                  itemRefs.current.get(entry.id)?.focus();
                }}
              />,
              document.body,
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Cascading submenu wrapper — measures + recurses ───────────────────────

interface CascadingSubmenuProps {
  parentEl: HTMLElement | null;
  items: DropdownMenuEntry[];
  hoverStyle: 'accent' | 'subtle';
  onClose: () => void;
  onMouseLeavePanel: () => void;
  keyboardOpen?: boolean;
  onKeyboardClose?: () => void;
}

function CascadingSubmenu({
  parentEl, items, hoverStyle, onClose, onMouseLeavePanel,
  keyboardOpen = false, onKeyboardClose,
}: CascadingSubmenuProps) {
  const parentRect = parentEl?.getBoundingClientRect();
  if (!parentRect) return null;
  const surfaceScope = fieldSurfaceScopeFor(parentEl);
  const zIndex = fieldSurfaceZ('submenu', parentEl);
  const SUB_WIDTH = 200;
  const { left, top } = chooseSubmenuPosition(parentRect, SUB_WIDTH, items.filter(i => !isSeparator(i)).length);

  return (
    <div
      data-cascading-menu
      data-field-no-canvas-input
      data-field-floating-surface
      data-field-surface-scope={surfaceScope}
      onMouseLeave={onMouseLeavePanel}
      style={{ position: 'fixed', left, top, zIndex }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -(SUBMENU_GAP + 2),
          top: 0,
          width: SUBMENU_GAP + 4,
          height: Math.min(items.filter(i => !isSeparator(i)).length * ESTIMATED_ITEM_HEIGHT + 16, 360),
        }}
      />
      <MenuPanel
        items={items}
        hoverStyle={hoverStyle}
        minWidth={SUB_WIDTH}
        onClose={onClose}
        style={{ position: 'static' }}
        autoFocusFirst={keyboardOpen}
        onArrowLeft={onKeyboardClose}
        zIndex={zIndex}
      />
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────────────

export default function DropdownMenu({
  isOpen, onClose, items, anchorRef, anchorPoint,
  position = 'bottom-right', minWidth, matchAnchorWidth,
  hoverStyle = 'accent', searchable, density = 'default', preferredFocusItemId,
}: DropdownMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceScope = fieldSurfaceScopeFor(anchorRef?.current ?? null);
  const backdropZIndex = fieldSurfaceZ('menu-backdrop', anchorRef?.current ?? null);
  const menuZIndex = fieldSurfaceZ('menu', anchorRef?.current ?? null);

  // Close on outside click — covers BOTH the root menu and any open
  // submenus. The submenu portals are siblings (under document.body) so
  // we check `closest('[data-cascading-menu]')` to see if the click hit
  // any menu surface; otherwise close.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-cascading-menu]')) return;
      if (anchorRef?.current && anchorRef.current.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        queueMicrotask(() => anchorRef?.current?.focus());
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen, onClose, anchorRef]);

  // Two-phase positioning so the menu never flashes off-screen on
  // anchors near the viewport edge.
  //
  //   1. First paint: render the panel off-screen (top/left = -9999)
  //      so the layout has measurable dimensions but the user doesn't
  //      see a flash at the wrong place.
  //   2. useLayoutEffect: measure the rendered panel + the anchor,
  //      compute the desired position from the `position` prop, then
  //      clamp/flip against the viewport (same rules
  //      `chooseSubmenuPosition` uses for submenus). Setting state
  //      schedules a synchronous repaint before the browser draws so
  //      the user sees only the clamped position.
  //
  // The clamp prefers flipping to the opposite side over shifting
  // (e.g. anchor near bottom + position='bottom-*' → flip to render
  // ABOVE the anchor) before falling back to a viewport-edge shift.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) { setPos(null); return; }
    // A coordinate anchorPoint (cursor context menus) wins over the DOM
    // anchor: element rects are viewport-true, but a virtual fixed-position
    // anchor DIV can be re-based by a will-change/transform ancestor, so
    // consumers pass the raw cursor coords instead of a DOM proxy.
    const anchor = anchorPoint
      ? { left: anchorPoint.x, right: anchorPoint.x, top: anchorPoint.y, bottom: anchorPoint.y }
      : anchorRef?.current?.getBoundingClientRect();
    const panel = measureRef.current?.getBoundingClientRect();
    if (!anchor || !panel) return;

    const PAD = VIEWPORT_PADDING;
    const GAP = 4;
    const w = panel.width;
    const h = panel.height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Desired position from the prop.
    let left: number;
    let top: number;
    if (position === 'right-start') {
      // Open BESIDE the anchor — top edges aligned. Flip to the left
      // side of the anchor if the panel would overflow the viewport.
      top = anchor.top;
      left = anchor.right + GAP;
      if (left + w > vw - PAD) left = anchor.left - w - GAP;
    } else {
      // Right/left names a horizontal EDGE alignment ("right" = right
      // edge of panel aligns with right edge of anchor); top/bottom
      // names which side of the anchor the panel sits on.
      left = position.includes('right') ? anchor.right - w : anchor.left;
      top  = position.includes('top')   ? anchor.top - h - GAP : anchor.bottom + GAP;
    }

    // Vertical clamp — prefer flipping to the opposite side first.
    if (top + h > vh - PAD) {
      // Overflowing bottom — try above the anchor.
      const flipped = anchor.top - h - GAP;
      top = flipped >= PAD ? flipped : Math.max(PAD, vh - PAD - h);
    }
    if (top < PAD) top = PAD;

    // Horizontal clamp — flip alignment, then shift if still
    // overflowing. Both the right→left flip and the left→right shift
    // are bounded so the panel always lands fully inside the viewport
    // when it fits at all.
    if (left + w > vw - PAD) {
      const flipped = anchor.right - w;            // try aligning to anchor.right
      left = flipped >= PAD ? flipped : vw - PAD - w;
    }
    if (left < PAD) left = PAD;

    setPos({ left, top });
  }, [isOpen, position, anchorRef, anchorPoint, items]);

  if (!isOpen) return null;

  // Phase-1 render uses a -9999 placement so the panel can be measured
  // without a visible flash. `pos` switches to the clamped values once
  // the layout effect runs.
  const style: React.CSSProperties = pos
    ? { left: pos.left, top: pos.top }
    : { left: -9999, top: -9999 };

  return createPortal(
    <div
      ref={rootRef}
      data-cascading-menu
      data-field-no-canvas-input
      data-field-floating-surface
      data-field-surface-scope={surfaceScope}
    >
      {/* Invisible full-screen click-catcher → context-menu behavior: a click
          anywhere outside the panel ONLY closes the menu, it does NOT also
          select a canvas node / another row / clear selection.
          CRITICAL: do NOT close on mousedown. Closing there unmounts this
          backdrop mid-gesture, so the trailing mouseup+click fall through to
          (and "enter") whatever is underneath. Instead swallow the whole press
          (preventDefault + stopPropagation, backdrop stays mounted) and close
          on the COMPLETED click / contextmenu — the entire down→up→click
          sequence lands on the backdrop, so nothing below ever receives it. */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: backdropZIndex }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseUp={(e) => { e.stopPropagation(); }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
      />
      <MenuPanel
        items={items}
        hoverStyle={hoverStyle}
        minWidth={minWidth}
        width={matchAnchorWidth && isOpen ? anchorRef?.current?.getBoundingClientRect().width || undefined : undefined}
        onClose={onClose}
        style={style}
        rootRef={measureRef}
        searchable={searchable}
        density={density}
        autoFocusFirst={!searchable && !!anchorRef}
        preferredFocusItemId={preferredFocusItemId}
        zIndex={menuZIndex}
      />
    </div>,
    document.body,
  );
}
