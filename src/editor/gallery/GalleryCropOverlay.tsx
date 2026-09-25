import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { getViewportPrefix } from '@/canvas/node-ops';
import {
  coverOverflow,
  focalPositionAfterDrag,
  formatObjectPosition,
  parseObjectPosition,
  type FocalPosition,
} from '@/canvas/gallery/crop-math';

interface GalleryCropOverlayProps {
  imageId: string;
  src: string;
  vpId: string;
  objectPosition: string;
  onCommit: (value: string) => void;
  onClose: () => void;
}

/**
 * Canvas crop/reposition mode for a Gallery image.
 *
 * Pointermove is DOM-only through the canvas bridge. Source is committed once
 * when the user explicitly finishes (Done / Enter), so a crop gesture never
 * runs the source pipeline at pointer frequency. Escape restores the source
 * value that existed when crop mode opened.
 */
export default function GalleryCropOverlay({
  imageId,
  src,
  vpId,
  objectPosition,
  onCommit,
  onClose,
}: GalleryCropOverlayProps) {
  const bridge = getCanvasBridge();
  const prefix = getViewportPrefix(vpId);
  const initial = useMemo(() => parseObjectPosition(objectPosition), [objectPosition]);
  const [position, setPosition] = useState<FocalPosition>(initial);
  const positionRef = useRef<FocalPosition>(initial);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    start: FocalPosition;
  } | null>(null);

  const syncRect = useCallback(() => {
    const next = bridge.getRect(imageId, prefix);
    setRect((previous) => {
      if (!next) return previous ? null : previous;
      if (previous
          && previous.left === next.left
          && previous.top === next.top
          && previous.width === next.width
          && previous.height === next.height) return previous;
      return next;
    });
  }, [bridge, imageId, prefix]);

  useEffect(() => {
    // Crop chrome lives in the parent document while the image lives in the
    // sandbox iframe. Poll the bridge's cheap rect cache for the lifetime of
    // crop mode so zoom/pan, viewport movement, and responsive reflow cannot
    // leave the overlay stranded over the image's old screen position. State
    // only updates when geometry actually changes.
    let raf = 0;
    const tick = () => {
      syncRect();
      raf = requestAnimationFrame(tick);
    };
    syncRect();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [syncRect]);

  useEffect(() => {
    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (!cancelled) setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      if (!cancelled) setNaturalSize(null);
    };
    image.src = src;
    return () => { cancelled = true; };
  }, [src]);

  const finish = useCallback(() => {
    onCommit(formatObjectPosition(positionRef.current));
    onClose();
  }, [onClose, onCommit]);

  const cancel = useCallback(() => {
    bridge.patchStyles(imageId, prefix, { objectPosition });
    onClose();
  }, [bridge, imageId, objectPosition, onClose, prefix]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [cancel, finish]);

  if (!rect || rect.width <= 0 || rect.height <= 0) return null;

  // Do not guess focal geometry before intrinsic dimensions are available. A
  // guessed frame-sized range changes the source focal point by the wrong
  // amount. The overlay is visible immediately, but dragging becomes effective
  // only once the bitmap reports the real cover overflow.
  const overflow = naturalSize
    ? coverOverflow(rect.width, rect.height, naturalSize.width, naturalSize.height)
    : { x: 0, y: 0 };
  const currentValue = formatObjectPosition(position);

  return createPortal(
    <div
      data-gallery-crop-overlay
      role="application"
      aria-label="Reposition gallery image"
      style={{
        position: 'fixed',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: 9000,
        boxSizing: 'border-box',
        border: '1px solid var(--selection)',
        outline: '1px solid color-mix(in srgb, var(--selection) 28%, transparent)',
        cursor: !naturalSize ? 'wait' : dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        if (!naturalSize) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          start: positionRef.current,
        };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        const next = focalPositionAfterDrag(
          drag.start,
          event.clientX - drag.x,
          event.clientY - drag.y,
          overflow.x,
          overflow.y,
        );
        positionRef.current = next;
        setPosition(next);
        bridge.patchStyles(imageId, prefix, { objectPosition: formatObjectPosition(next) });
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.currentTarget.releasePointerCapture(event.pointerId);
        dragRef.current = null;
        setDragging(false);
        // Keep crop mode open so the user can refine the focal point. Source is
        // committed once through Done/Enter rather than after every micro-drag.
      }}
      onPointerCancel={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        setDragging(false);
        positionRef.current = drag.start;
        setPosition(drag.start);
        bridge.patchStyles(imageId, prefix, { objectPosition: formatObjectPosition(drag.start) });
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 14,
          height: 14,
          transform: 'translate(-50%, -50%)',
          border: '1px solid rgba(255,255,255,.9)',
          borderRadius: '50%',
          boxShadow: '0 0 0 1px rgba(0,0,0,.35)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: -32,
          transform: 'translateX(-50%)',
          height: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 8px',
          border: '1px solid var(--control-border)',
          borderRadius: 5,
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          boxShadow: '0 2px 8px rgba(0,0,0,.18)',
          fontSize: 11,
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span>Drag to reposition</span>
        <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{currentValue}</span>
        <button
          type="button"
          onClick={finish}
          style={{ color: 'var(--accent-text)', background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
        >
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
