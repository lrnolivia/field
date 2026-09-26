import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { getViewportPrefix } from '@/canvas/node-ops';
import {
  clampGalleryZoom,
  galleryMediaTreatmentPatch,
  normalizeGalleryRotation,
  type GalleryMediaTreatment,
} from '@/code/gallery/gallery-media-treatment';
import {
  coverOverflow,
  focalPositionAfterDrag,
  focalPositionAfterNudge,
  formatObjectPosition,
  parseObjectPosition,
  type FocalPosition,
} from '@/canvas/gallery/crop-math';

interface GalleryCropOverlayProps {
  imageId: string;
  src: string;
  vpId: string;
  objectPosition: string;
  zoom: number;
  rotation: number;
  onCommit: (treatment: GalleryMediaTreatment) => void;
  onClose: () => void;
}

interface PointerPoint {
  x: number;
  y: number;
}

interface GestureStart {
  distance: number;
  angle: number;
  zoom: number;
  rotation: number;
}

function pointerDistance(a: PointerPoint, b: PointerPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointerAngle(a: PointerPoint, b: PointerPoint): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

function angleDeltaDegrees(start: number, next: number): number {
  let delta = next - start;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

export default function GalleryCropOverlay({
  imageId,
  src,
  vpId,
  objectPosition,
  zoom,
  rotation,
  onCommit,
  onClose,
}: GalleryCropOverlayProps) {
  const bridge = getCanvasBridge();
  const prefix = getViewportPrefix(vpId);
  const initialPosition = useMemo(() => parseObjectPosition(objectPosition), [objectPosition]);
  const initialZoom = useMemo(() => clampGalleryZoom(zoom), [zoom]);
  const initialRotation = useMemo(() => normalizeGalleryRotation(rotation), [rotation]);

  const [position, setPosition] = useState<FocalPosition>(initialPosition);
  const [mediaZoom, setMediaZoom] = useState(initialZoom);
  const [mediaRotation, setMediaRotation] = useState(initialRotation);
  const positionRef = useRef<FocalPosition>(initialPosition);
  const zoomRef = useRef(initialZoom);
  const rotationRef = useRef(initialRotation);

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasFocusedRef = useRef(false);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef<GestureStart | null>(null);
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
    if (!rect || hasFocusedRef.current) return;
    overlayRef.current?.focus({ preventScroll: true });
    hasFocusedRef.current = true;
  }, [rect]);

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

  const patchLive = useCallback((nextPosition: FocalPosition, nextZoom: number, nextRotation: number) => {
    bridge.patchStyles(
      imageId,
      prefix,
      galleryMediaTreatmentPatch(formatObjectPosition(nextPosition), nextZoom, nextRotation),
    );
  }, [bridge, imageId, prefix]);

  const setLiveTreatment = useCallback((
    nextPosition: FocalPosition,
    nextZoom: number,
    nextRotation: number,
  ) => {
    const clampedZoom = clampGalleryZoom(nextZoom);
    const normalizedRotation = normalizeGalleryRotation(nextRotation);
    positionRef.current = nextPosition;
    zoomRef.current = clampedZoom;
    rotationRef.current = normalizedRotation;
    setPosition(nextPosition);
    setMediaZoom(clampedZoom);
    setMediaRotation(normalizedRotation);
    patchLive(nextPosition, clampedZoom, normalizedRotation);
  }, [patchLive]);

  const finish = useCallback(() => {
    onCommit({
      objectPosition: formatObjectPosition(positionRef.current),
      zoom: zoomRef.current,
      rotation: rotationRef.current,
    });
    onClose();
  }, [onClose, onCommit]);

  const cancel = useCallback(() => {
    bridge.patchStyles(
      imageId,
      prefix,
      galleryMediaTreatmentPatch(objectPosition, initialZoom, initialRotation),
    );
    onClose();
  }, [bridge, imageId, initialRotation, initialZoom, objectPosition, onClose, prefix]);

  const reset = useCallback(() => {
    setLiveTreatment({ x: 50, y: 50 }, 1, 0);
  }, [setLiveTreatment]);

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

  const overflow = naturalSize
    ? coverOverflow(rect.width, rect.height, naturalSize.width, naturalSize.height, mediaZoom)
    : { x: 0, y: 0 };
  const currentValue = formatObjectPosition(position);

  const beginGesture = () => {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) {
      gestureRef.current = null;
      return;
    }
    gestureRef.current = {
      distance: Math.max(1, pointerDistance(points[0], points[1])),
      angle: pointerAngle(points[0], points[1]),
      zoom: zoomRef.current,
      rotation: rotationRef.current,
    };
    dragRef.current = null;
  };

  const continueSinglePointer = () => {
    const entry = [...pointersRef.current.entries()][0];
    if (!entry) {
      dragRef.current = null;
      setDragging(false);
      return;
    }
    dragRef.current = {
      pointerId: entry[0],
      x: entry[1].x,
      y: entry[1].y,
      start: positionRef.current,
    };
    setDragging(true);
  };

  return createPortal(
    <div
      ref={overlayRef}
      data-gallery-crop-overlay
      data-field-no-canvas-input="true"
      role="dialog"
      aria-label="Reposition gallery image"
      tabIndex={0}
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
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const factor = Math.exp(-event.deltaY * 0.002);
        setLiveTreatment(positionRef.current, zoomRef.current * factor, rotationRef.current);
      }}
      onKeyDown={(event) => {
        if (!naturalSize) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          const step = event.shiftKey ? 5 : 1;
          const imageDeltaX = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
          const imageDeltaY = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
          const next = focalPositionAfterNudge(positionRef.current, imageDeltaX, imageDeltaY, overflow.x, overflow.y);
          setLiveTreatment(next, zoomRef.current, rotationRef.current);
          return;
        }
        if (event.key === '[' || event.key === ']') {
          event.preventDefault();
          event.stopPropagation();
          const step = event.shiftKey ? 15 : 1;
          setLiveTreatment(
            positionRef.current,
            zoomRef.current,
            rotationRef.current + (event.key === '[' ? -step : step),
          );
          return;
        }
        if (event.key === '-' || event.key === '_' || event.key === '=' || event.key === '+') {
          event.preventDefault();
          event.stopPropagation();
          const step = event.shiftKey ? 0.25 : 0.05;
          const direction = event.key === '-' || event.key === '_' ? -1 : 1;
          setLiveTreatment(positionRef.current, zoomRef.current + direction * step, rotationRef.current);
        }
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!naturalSize) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointersRef.current.size >= 2) {
          beginGesture();
          setDragging(true);
          return;
        }
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          start: positionRef.current,
        };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        if (!pointersRef.current.has(event.pointerId)) return;
        event.preventDefault();
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (pointersRef.current.size >= 2) {
          if (!gestureRef.current) beginGesture();
          const gesture = gestureRef.current;
          const points = [...pointersRef.current.values()];
          if (!gesture || points.length < 2) return;
          const distance = Math.max(1, pointerDistance(points[0], points[1]));
          const angle = pointerAngle(points[0], points[1]);
          setLiveTreatment(
            positionRef.current,
            gesture.zoom * (distance / gesture.distance),
            gesture.rotation + angleDeltaDegrees(gesture.angle, angle),
          );
          return;
        }

        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const next = focalPositionAfterDrag(
          drag.start,
          event.clientX - drag.x,
          event.clientY - drag.y,
          overflow.x,
          overflow.y,
        );
        setLiveTreatment(next, zoomRef.current, rotationRef.current);
      }}
      onPointerUp={(event) => {
        if (!pointersRef.current.has(event.pointerId)) return;
        event.preventDefault();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        pointersRef.current.delete(event.pointerId);
        gestureRef.current = null;
        if (pointersRef.current.size === 1) continueSinglePointer();
        else {
          dragRef.current = null;
          setDragging(false);
        }
      }}
      onPointerCancel={(event) => {
        pointersRef.current.delete(event.pointerId);
        gestureRef.current = null;
        if (pointersRef.current.size === 1) continueSinglePointer();
        else {
          dragRef.current = null;
          setDragging(false);
        }
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
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
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
        <span>Drag · wheel/pinch zoom · [ ] rotate · Shift for 5%</span>
        <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {currentValue} · {Math.round(mediaZoom * 100)}% · {Math.round(mediaRotation * 10) / 10}°
        </span>
        <button
          type="button"
          aria-label="Rotate image left 15 degrees"
          onClick={() => setLiveTreatment(positionRef.current, zoomRef.current, rotationRef.current - 15)}
          style={{ color: 'var(--text-secondary)', background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
        >
          −15°
        </button>
        <button
          type="button"
          onClick={reset}
          style={{ color: 'var(--text-secondary)', background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
        >
          Reset
        </button>
        <button
          type="button"
          aria-label="Rotate image right 15 degrees"
          onClick={() => setLiveTreatment(positionRef.current, zoomRef.current, rotationRef.current + 15)}
          style={{ color: 'var(--text-secondary)', background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
        >
          +15°
        </button>
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
