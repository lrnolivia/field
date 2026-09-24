// SpaceControl.tsx — X/Y coordinate inputs for canvas-level positioning.
// Polls bridge rectCache during drag/resize so the inputs tick in real time
// while the strategy writes per-frame `transform: translate()` offsets.

import { useEffect, useSyncExternalStore } from 'react';
import { useLivePreview } from '../../hooks/useLivePreview';
import { ToolInput } from '../../controls';
import { captureVisualRect } from '@/canvas/visual-rect';
import { dragStateOps } from '@/canvas/drag/drag-state-store';

interface Props {
  left: string;
  top: string;
  nodeId: string;
  vpId: string;
  onUpdate: (key: string, value: string) => void;
}

export default function SpaceControl({ left, top, nodeId, vpId, onUpdate }: Props) {
  // Gate the live-poll on `dragStateOps` (an actual element drag /
  // resize is in progress), NOT `canvasInteractingAtom`. The latter
  // also flips true during pure CAMERA pan/zoom — and during pan
  // there's a one-frame race between the parent updating the
  // transform synchronously and the iframe pushing back fresh rects.
  // Reading the cache mid-pan gives screen rects from before the pan
  // combined with the post-pan transform, producing canvas-space
  // numbers that track the cursor while panning. Element-drag-only
  // gating eliminates the symptom: the rectCache only updates from
  // an element being dragged, never from a pure pan.
  const isDragging = useSyncExternalStore(dragStateOps.subscribe, dragStateOps.get);

  // Live X/Y derived from the bridge's screen rect, converted into canvas
  // space. Inline `el.style.left/top` doesn't change during drag (the
  // strategy writes only `transform: translate(...)` per frame), so reading
  // the rect is the only way to see live movement.
  // Cleared when styles update (mutation flushed) OR when the selection
  // target changes. The nodeId / vpId reset matters when the user enters a
  // master via double-click: the camera pre-zoom fires
  // `transformManager.setTransform`, which subscribes flip
  // `canvasInteracting` to true, which kicks this component's poll loop.
  // The first poll reads the bridge rectCache for the freshly-selected node
  // — but the cache may still hold stale rects from the previous file for
  // ~1 frame. Without resetting livePos on nodeId change, that stale value
  // sticks until the 100ms-debounced canvasInteracting-clear in Canvas.tsx
  // fires — visible as "Space X/Y briefly shows wrong number, then snaps to
  // 0,0". Clearing on id change forces the input to fall back to the
  // `left`/`top` props (the actual node-style values) from the very first
  // paint.
  const [livePos, setLivePos] = useLivePreview<{ x: string; y: string }>([left, top, nodeId, vpId]);

  useEffect(() => {
    if (!isDragging) return;
    let rafId: number;
    const poll = () => {
      const rect = captureVisualRect(nodeId, vpId);
      if (rect) {
        const x = `${Math.round(rect.left)}px`;
        const y = `${Math.round(rect.top)}px`;
        setLivePos(prev => (prev?.x === x && prev?.y === y) ? prev : { x, y });
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [isDragging, nodeId, vpId]);

  const restRect = captureVisualRect(nodeId, vpId);
  const xVal = parseFloat(livePos?.x ?? '') || restRect?.left || parseFloat(left) || 0;
  const yVal = parseFloat(livePos?.y ?? '') || restRect?.top || parseFloat(top) || 0;

  return (
    <div data-position-xy className="grid grid-cols-2 gap-1 w-full">
      <ToolInput value={String(Math.round(xVal))} onChange={(v) => onUpdate('left', `${parseFloat(v) || 0}px`)} step={1} chevronLabel="X" ariaLabel="X position" />
      <ToolInput value={String(Math.round(yVal))} onChange={(v) => onUpdate('top', `${parseFloat(v) || 0}px`)} step={1} chevronLabel="Y" ariaLabel="Y position" />
    </div>
  );
}
