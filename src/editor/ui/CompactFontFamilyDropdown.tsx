import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import FontFamilyPopup from './FontFamilyPopup';

interface CompactFontFamilyDropdownProps {
  value: string;
  onChange: (family: string) => void;
  onPreview?: (family: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
}

interface Position {
  left: number;
  top: number;
}

const WIDTH = 244;
const ESTIMATED_HEIGHT = 284;
const VIEWPORT_PADDING = 8;
const GAP = 4;

/**
 * Compact, field-native font-family dropdown for the Inspector family trigger.
 *
 * It deliberately reuses FontFamilyPopup's inline content so quick-pick and
 * Browse Fonts share the same workspace/Google font identity, row styling,
 * selected state, hover preview, loading, and search behavior. This wrapper
 * only owns the lighter dropdown geometry and dismissal behavior.
 */
export default function CompactFontFamilyDropdown({
  value,
  onChange,
  onPreview,
  isOpen,
  onClose,
  anchorRef,
}: CompactFontFamilyDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const close = useCallback(() => {
    onPreview?.(null);
    onClose();
  }, [onClose, onPreview]);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - VIEWPORT_PADDING - GAP;
    const above = rect.top - VIEWPORT_PADDING - GAP;
    const openAbove = below < Math.min(ESTIMATED_HEIGHT, 180) && above > below;
    const visibleHeight = Math.min(ESTIMATED_HEIGHT, Math.max(160, openAbove ? above : below));

    let left = rect.left;
    left = Math.min(left, window.innerWidth - WIDTH - VIEWPORT_PADDING);
    left = Math.max(VIEWPORT_PADDING, left);

    let top = openAbove ? rect.top - visibleHeight - GAP : rect.bottom + GAP;
    top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - visibleHeight - VIEWPORT_PADDING));
    setPosition({ left, top });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    place();
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, place]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (menuRef.current?.contains(target) || anchorRef.current?.contains(target))) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    const onViewportChange = () => place();
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [anchorRef, close, isOpen, place]);

  if (!isOpen || !position) return null;

  const style: CSSProperties = {
    left: position.left,
    top: position.top,
    width: WIDTH,
    zIndex: 100020,
  };

  return createPortal(
    <div
      ref={menuRef}
      data-compact-font-family-menu
      data-field-menu-surface
      data-field-no-canvas-input
      role="dialog"
      aria-label="Font family"
      style={style}
      className="fixed max-h-[284px] overflow-hidden rounded-[5px] border border-[var(--border-light)] bg-[var(--dropdown-bg,var(--bg-surface))] shadow-[var(--shadow-lg)] p-2.5"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onWheelCapture={(event) => event.stopPropagation()}
    >
      <FontFamilyPopup
        value={value}
        onChange={onChange}
        onPreview={onPreview}
        isOpen
        onClose={close}
        anchorRef={anchorRef}
        inline
        compact
      />
    </div>,
    document.body,
  );
}
