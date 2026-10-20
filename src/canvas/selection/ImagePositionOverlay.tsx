// ImagePositionOverlay.tsx — canvas "Position" mode for an image fill.
//
// Entered from the Fill / Image Inspector ("Adjust"). The selected Frame's
// background image — or an <img>/<video> with `object-fit` — is dragged
// directly on the canvas INSIDE its fixed box:
//
//   - pointer and touch, camera-aware (zoom, pan and rotation come from the
//     box's painted quad, not raw screen px)
//   - fit/fill/scale model: the painted image size comes from
//     background-size / object-fit and the image's natural size, so the image
//     tracks the pointer 1:1 and stays within its legal range (a cover image
//     keeps covering, a contained image stays inside)
//   - the Frame never moves: the overlay owns the interior pointer stream
//   - Done / Enter / click outside / selection change commit ONE source
//     write (one undo step); Escape / Cancel restore the original untouched
//
// Live frames are DOM-only (`domOnly`), exactly like the other handles.

import { useCallback, useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import type { ScreenCorners } from '@/canvas/resize/geometry-utils';
import { findNodeComputedStyles, getContentRoot, updateNodeStyles } from '@/canvas/node-ops';
import { getNodeFromCache, selectedIdsAtom } from '@/code/stores/store';
import { imagePositionTargetAtom } from '@/code/stores/image-position-store';
import { MEDIA_TAGS, SELECTION_COLOR } from '@/shared/constants';
import { SANDBOX_ORIGIN } from '@/canvas-sandbox/protocol';
import { trace } from '@/shared/debug-trace';
import {
  dragImagePosition, formatPositionPercent, parsePositionPercent, renderedImageSize, screenDeltaToLocal,
  type Percent, type Size,
} from './image-position-math';

interface Props {
  corners: ScreenCorners;
  nodeId: string;
  vpId: string;
  color?: string;
  onInteracting: (v: boolean) => void;
}

interface Target {
  property: 'backgroundPosition' | 'objectPosition';
  fit: string;
  url: string | null;
  start: Percent;
  original: string;
}

function readTarget(nodeId: string, vpId: string): Target | null {
  const node = getNodeFromCache(nodeId);
  if (!node) return null;
  const tag = (node.type || '').toLowerCase();
  const src = node.styles ?? {};
  const computed = findNodeComputedStyles(nodeId, vpId, [
    'backgroundImage', 'backgroundSize', 'backgroundPosition', 'objectFit', 'objectPosition',
  ]);
  const read = (k: string) => src[k] || computed[k] || '';
  if (MEDIA_TAGS.has(tag) && tag !== 'svg' && tag !== 'audio' && tag !== 'iframe') {
    const original = read('objectPosition');
    return {
      property: 'objectPosition',
      fit: read('objectFit') || 'fill',
      url: node.attrs?.src || node.attrs?.poster || null,
      start: parsePositionPercent(original || '50% 50%'),
      original,
    };
  }
  const bg = read('backgroundImage');
  const m = bg.match(/url\((['"]?)(.*?)\1\)/);
  if (!m) return null;
  const original = read('backgroundPosition');
  return {
    property: 'backgroundPosition',
    fit: read('backgroundSize') || 'auto',
    url: m[2],
    start: parsePositionPercent(original || '0% 0%'),
    original,
  };
}

/** Natural image size, resolved against the canvas sandbox origin. */
function useNaturalSize(url: string | null): Size | null {
  const [size, setSize] = useState<Size | null>(null);
  useEffect(() => {
    setSize(null);
    if (!url) return;
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setSize({ width: img.naturalWidth, height: img.naturalHeight }); };
    try { img.src = new URL(url, SANDBOX_ORIGIN).href; } catch { img.src = url; }
    return () => { alive = false; };
  }, [url]);
  return size;
}

/** One Position-mode session at a time. Module-scoped, not component state:
 *  the selection chrome re-renders (and can remount this overlay) around
 *  `onInteracting`, and a live drag must not lose its start or dirty flag. */
interface Session { nodeId: string; vpId: string; target: Target; current: Percent; dirty: boolean }
let session: Session | null = null;

/** End the active session: `commit` writes ONE source change (one undo step)
 *  when the image moved; `cancel` restores the original DOM value. Safe to
 *  call when no session is active. Exported so the always-mounted selection
 *  layer can close a session whose overlay already unmounted. */
export function endImagePositionSession(mode: 'commit' | 'cancel'): void {
  const s = session;
  session = null;
  if (!s) return;
  const contentEl = getContentRoot();
  if (contentEl && s.dirty) {
    const value = mode === 'commit'
      ? formatPositionPercent(s.current)
      : (s.target.original || formatPositionPercent(s.target.start));
    updateNodeStyles({ id: s.nodeId, styles: { [s.target.property]: value }, contentEl, domOnly: mode === 'cancel' });
  }
  trace.action(`image-position:${mode}`, { nodeId: s.nodeId, property: s.target.property, value: formatPositionPercent(s.current), dirty: s.dirty });
}

export default function ImagePositionOverlay({ corners, nodeId, vpId, color = SELECTION_COLOR, onInteracting }: Props) {
  const [target, setTarget] = useAtom(imagePositionTargetAtom);
  const selectedIds = useAtomValue(selectedIdsAtom);
  const active = !!target && target.nodeId === nodeId && target.vpId === vpId;
  const [dragging, setDragging] = useState(false);

  if (active && (!session || session.nodeId !== nodeId || session.vpId !== vpId)) {
    const t = readTarget(nodeId, vpId);
    session = t ? { nodeId, vpId, target: t, current: t.start, dirty: false } : null;
  }
  const info = { current: active ? session?.target ?? null : null };
  const natural = useNaturalSize(active ? info.current?.url ?? null : null);

  const write = useCallback((value: string, commit: boolean) => {
    const contentEl = getContentRoot();
    const property = session?.target.property;
    if (!contentEl || !property) return;
    updateNodeStyles({ id: nodeId, styles: { [property]: value }, contentEl, domOnly: !commit });
  }, [nodeId]);

  const finish = useCallback((mode: 'commit' | 'cancel') => {
    if (session?.nodeId === nodeId) endImagePositionSession(mode);
    setTarget(null);
  }, [nodeId, setTarget]);

  // Keyboard: Enter = Done, Escape = cancel. Capture phase so the canvas's
  // own Escape (deselect) does not run first.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish('cancel'); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish('commit'); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, finish]);

  // Selection moved away → commit, like leaving Figma's crop mode.
  useEffect(() => {
    if (active && (selectedIds.length !== 1 || selectedIds[0] !== nodeId)) finish('commit');
  }, [active, selectedIds, nodeId, finish]);

  // Click anywhere outside the overlay/bar → commit.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.('[data-image-position-overlay], [data-image-position-bar]')) return;
      finish('commit');
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [active, finish]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const s = session;
    if (!s || s.nodeId !== nodeId) return;
    const t = s.target;
    const computed = findNodeComputedStyles(nodeId, vpId, ['width', 'height']);
    const box: Size = { width: parseFloat(computed.width), height: parseFloat(computed.height) };
    if (!(box.width > 0) || !(box.height > 0)) return;
    const img = renderedImageSize(t.fit, box, natural);
    const from = { ...s.current };
    const startX = e.clientX;
    const startY = e.clientY;
    const pointerId = e.pointerId;
    (e.currentTarget as Element).setPointerCapture?.(pointerId);
    setDragging(true);
    onInteracting(true);
    trace.action('image-position:drag-start', { nodeId, property: t.property, fit: t.fit, box, img, from });

    const onMove = (me: PointerEvent) => {
      if (me.pointerId !== pointerId) return;
      const local = screenDeltaToLocal({ x: me.clientX - startX, y: me.clientY - startY }, corners, box);
      // Natural size unknown (still loading / failed): fall back to a
      // proportional nudge so the mode still works.
      const next = img
        ? dragImagePosition(from, local, box, img)
        : dragImagePosition(from, local, box, { width: box.width * 1.5, height: box.height * 1.5 });
      s.current = next;
      s.dirty = true;
      write(formatPositionPercent(next), false);
    };
    const onUp = (ue: PointerEvent) => {
      if (ue.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDragging(false);
      onInteracting(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [nodeId, vpId, corners, natural, onInteracting, write]);

  if (!active || !info.current) return null;

  const xs = [corners.TL.x, corners.TR.x, corners.BR.x, corners.BL.x];
  const ys = [corners.TL.y, corners.TR.y, corners.BR.y, corners.BL.y];
  const clip = `polygon(${[corners.TL, corners.TR, corners.BR, corners.BL].map(p => `${p.x - Math.min(...xs)}px ${p.y - Math.min(...ys)}px`).join(', ')})`;
  const barLeft = (Math.min(...xs) + Math.max(...xs)) / 2;
  const barTop = Math.max(...ys) + 10;

  return (
    <>
      <div
        data-image-position-overlay=""
        aria-label="Drag to position the image"
        onPointerDown={onPointerDown}
        style={{
          position: 'fixed',
          left: Math.min(...xs),
          top: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
          clipPath: clip,
          cursor: dragging ? 'grabbing' : 'grab',
          pointerEvents: 'all',
          touchAction: 'none',
          outline: `1px dashed ${color}`,
          zIndex: 6,
        }}
      />
      <div
        data-image-position-bar=""
        // Keep the press away from the canvas container (it would deselect
        // and unmount this bar before the click lands).
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onMouseDown={(e) => e.stopPropagation()}
        role="toolbar"
        aria-label="Image position"
        style={{
          position: 'fixed',
          left: barLeft,
          top: barTop,
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          padding: 4,
          borderRadius: 9,
          background: 'var(--bg-panel, #fff)',
          border: '1px solid var(--border-light, rgba(0,0,0,0.1))',
          boxShadow: '0 4px 14px rgba(0,0,0,0.14)',
          pointerEvents: 'all',
          zIndex: 7,
        }}
      >
        <button
          type="button"
          onClick={() => finish('cancel')}
          className="h-7 px-3 rounded-[6px] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => finish('commit')}
          className="h-7 px-3 rounded-[6px] text-[12px] font-medium text-white"
          style={{ background: color }}
        >
          Done
        </button>
      </div>
    </>
  );
}
