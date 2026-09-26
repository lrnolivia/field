import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { fieldSurfaceScopeFor, fieldSurfaceZ } from '@/shared/field-surface-elevation';

export interface FieldSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Optional richer left-side content for future Inspector pickers. */
  leading?: ReactNode;
}

export interface FieldSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FieldSelectOption[];
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
  /** Hide the selected-value text while retaining the field-owned chevron trigger. */
  showSelectedLabel?: boolean;
  density?: 'default' | 'compact';
  align?: 'left' | 'right';
  menuMinWidth?: number;
  menuMaxHeight?: number;
  /** Called after the menu closes, including Escape/outside-click dismissal. */
  onOpenChange?: (open: boolean) => void;
}

interface MenuPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  openAbove: boolean;
}

const VIEWPORT_PADDING = 8;
const MENU_GAP = 4;
const DEFAULT_MAX_HEIGHT = 280;
const DEFAULT_ROW_HEIGHT = 28;
const COMPACT_ROW_HEIGHT = 24;

function enabledIndex(options: FieldSelectOption[], start: number, direction: 1 | -1): number {
  if (options.length === 0) return -1;
  let index = start;
  for (let i = 0; i < options.length; i += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

function edgeEnabledIndex(options: FieldSelectOption[], edge: 'start' | 'end'): number {
  if (edge === 'start') return options.findIndex(option => !option.disabled);
  for (let i = options.length - 1; i >= 0; i -= 1) {
    if (!options[i]?.disabled) return i;
  }
  return -1;
}

/**
 * field-owned listbox control for Inspector option selection.
 *
 * No native HTML select is used. The option surface is portalled to body so
 * Inspector/tool-popup overflow cannot clip it. The menu owns wheel gestures
 * and marks itself as a non-canvas interaction surface for shared routing.
 */
export default function FieldSelect({
  value,
  onChange,
  options,
  disabled = false,
  ariaLabel,
  className = '',
  triggerClassName = '',
  showSelectedLabel = true,
  density = 'default',
  align = 'left',
  menuMinWidth,
  menuMaxHeight = DEFAULT_MAX_HEIGHT,
  onOpenChange,
}: FieldSelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const selectedIndex = useMemo(
    () => options.findIndex(option => option.value === value),
    [options, value],
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const rowHeight = density === 'compact' ? COMPACT_ROW_HEIGHT : DEFAULT_ROW_HEIGHT;

  const setOpen = useCallback((next: boolean) => {
    setIsOpen(next);
    onOpenChange?.(next);
    if (!next) setHighlightedIndex(-1);
  }, [onOpenChange]);

  const calculatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(
      menuMaxHeight,
      Math.max(rowHeight + 8, options.length * rowHeight + 8),
    );
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - VIEWPORT_PADDING - MENU_GAP);
    const spaceAbove = Math.max(0, rect.top - VIEWPORT_PADDING - MENU_GAP);
    const openAbove = spaceBelow < Math.min(estimatedHeight, rowHeight * 4) && spaceAbove > spaceBelow;
    const available = openAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(rowHeight + 8, Math.min(menuMaxHeight, available));
    const measuredWidth = Math.max(rect.width, menuMinWidth ?? 0);
    const width = Math.min(measuredWidth, Math.max(80, window.innerWidth - VIEWPORT_PADDING * 2));

    let left = align === 'right' ? rect.right - width : rect.left;
    left = Math.min(left, window.innerWidth - VIEWPORT_PADDING - width);
    left = Math.max(VIEWPORT_PADDING, left);

    const visibleHeight = Math.min(estimatedHeight, maxHeight);
    let top = openAbove ? rect.top - MENU_GAP - visibleHeight : rect.bottom + MENU_GAP;
    top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - VIEWPORT_PADDING - visibleHeight));

    setPosition({ left, top, width, maxHeight, openAbove });
  }, [align, menuMaxHeight, menuMinWidth, options.length, rowHeight]);

  const chooseIndex = useCallback((index: number) => {
    const option = options[index];
    if (!option || option.disabled || disabled) return;
    if (option.value !== value) onChange(option.value);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [disabled, onChange, options, setOpen, value]);

  const openFromKeyboard = useCallback((direction: 1 | -1) => {
    if (disabled || options.length === 0) return;
    const start = selectedIndex >= 0 ? selectedIndex - direction : direction === 1 ? -1 : 0;
    const next = enabledIndex(options, start, direction);
    if (next < 0) return;
    setHighlightedIndex(next);
    setOpen(true);
  }, [disabled, options, selectedIndex, setOpen]);

  const moveHighlight = useCallback((direction: 1 | -1) => {
    const start = highlightedIndex >= 0
      ? highlightedIndex
      : selectedIndex >= 0
        ? selectedIndex
        : direction === 1 ? -1 : 0;
    const next = enabledIndex(options, start, direction);
    if (next >= 0) setHighlightedIndex(next);
  }, [highlightedIndex, options, selectedIndex]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    calculatePosition();
    const raf = requestAnimationFrame(calculatePosition);
    return () => cancelAnimationFrame(raf);
  }, [calculatePosition, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const node = event.target as Node | null;
      if (node && (triggerRef.current?.contains(node) || menuRef.current?.contains(node))) return;
      setOpen(false);
    };
    const onViewportChange = () => calculatePosition();

    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [calculatePosition, isOpen, setOpen]);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) openFromKeyboard(1);
      else moveHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) openFromKeyboard(-1);
      else moveHighlight(-1);
      return;
    }
    if (event.key === 'Home' && isOpen) {
      event.preventDefault();
      setHighlightedIndex(edgeEnabledIndex(options, 'start'));
      return;
    }
    if (event.key === 'End' && isOpen) {
      event.preventDefault();
      setHighlightedIndex(edgeEnabledIndex(options, 'end'));
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && isOpen) {
      event.preventDefault();
      if (highlightedIndex >= 0) chooseIndex(highlightedIndex);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && !isOpen) {
      event.preventDefault();
      openFromKeyboard(1);
      return;
    }
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'Tab' && isOpen) setOpen(false);
  };

  const triggerDensity = density === 'compact'
    ? 'h-5 px-1.5 text-[10px]'
    : 'h-[var(--control-height)] px-2 text-xs';
  const optionDensity = density === 'compact'
    ? 'min-h-6 px-2 py-1 text-[10px]'
    : 'min-h-7 px-2 py-1.5 text-[11px]';

  const menuSurfaceScope = fieldSurfaceScopeFor(triggerRef.current);
  const menuZIndex = fieldSurfaceZ('select', triggerRef.current);

  const menuStyle: CSSProperties | undefined = position ? {
    left: position.left,
    top: position.top,
    width: position.width,
    maxHeight: position.maxHeight,
    zIndex: menuZIndex,
    boxShadow: 'var(--menu-shadow, 0 12px 32px rgba(0, 0, 0, 0.28))',
  } : undefined;

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        data-field-select-trigger
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled || options.length === 0}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled || options.length === 0) return;
          if (!isOpen) {
            const next = selectedIndex >= 0 && !options[selectedIndex]?.disabled
              ? selectedIndex
              : edgeEnabledIndex(options, 'start');
            setHighlightedIndex(next);
          }
          setOpen(!isOpen);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`
          group w-full min-w-0 flex items-center ${showSelectedLabel ? 'justify-between' : 'justify-center'} gap-1.5
          ${triggerDensity}
          bg-[var(--grid-line,var(--bg-input))]
          border border-[var(--control-border)] [--cut-border-color:var(--control-border)]
          cut-corners cut-border text-[var(--text-primary)] text-left
          transition-colors focus:outline-none focus:[--cut-border-color:var(--border-focus,var(--accent))]
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:[--cut-border-color:var(--control-border-hover)] hover:border-[var(--control-border-hover)]'
          }
          ${triggerClassName}
        `}
      >
        {showSelectedLabel && <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? value}</span>}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          data-field-menu-surface
          data-field-no-canvas-input
          data-field-floating-surface
          data-field-surface-scope={menuSurfaceScope}
          data-field-select-direction={position.openAbove ? 'up' : 'down'}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onWheelCapture={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          className="fixed overflow-y-auto overscroll-contain bg-[var(--dropdown-bg,var(--bg-surface))] border border-[var(--border-light)] [--cut-border-color:var(--border-light)] cut-corners cut-lg cut-border py-1"
          style={menuStyle}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const highlighted = index === highlightedIndex;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                tabIndex={-1}
                onMouseEnter={() => {
                  if (!option.disabled) setHighlightedIndex(index);
                }}
                onClick={() => chooseIndex(index)}
                className={`
                  mx-1 w-[calc(100%-8px)] flex items-center gap-2 cut-corners text-left
                  ${optionDensity}
                  ${option.disabled
                    ? 'opacity-40 cursor-default text-[var(--text-secondary)]'
                    : selected
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] cursor-pointer'
                      : highlighted
                        ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] cursor-pointer'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer'
                  }
                `}
              >
                {option.leading && <span className="shrink-0 flex items-center justify-center">{option.leading}</span>}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {selected && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
