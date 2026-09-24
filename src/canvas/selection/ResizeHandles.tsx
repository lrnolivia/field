// ResizeHandles.tsx — Figma-style corner resize handles + invisible edge hit areas.
// Four tiny square corner handles when both axes are resizable; wide invisible
// edge hit targets preserve easy one-axis resizing without chunky chrome.

import { RESIZE_HANDLE_SIZE, SELECTION_COLOR } from '@/shared/constants';
import type { ScreenCorners, Direction } from '@/canvas/resize/geometry-utils';
import { midpoint } from '@/canvas/resize/geometry-utils';
import { getResizeCursor } from '@/canvas/resize/cursor-utils';

interface Props {
  corners: ScreenCorners;
  rotation: number;
  onResizeStart: (direction: Direction, e: React.PointerEvent) => void;
  color?: string;
  disableHorizontal?: boolean;
  disableVertical?: boolean;
}

export default function ResizeHandles({
  corners, rotation, onResizeStart,
  color = SELECTION_COLOR,
  disableHorizontal = false,
  disableVertical = false,
}: Props) {
  const visualSize = Math.max(6, RESIZE_HANDLE_SIZE - 1);
  const hitSize = Math.max(14, RESIZE_HANDLE_SIZE + 6);

  const visibleHandles: { pos: { x: number; y: number }; dir: Direction }[] = [];
  if (!disableHorizontal && !disableVertical) {
    visibleHandles.push(
      { pos: corners.TL, dir: 'topLeft' },
      { pos: corners.TR, dir: 'topRight' },
      { pos: corners.BR, dir: 'bottomRight' },
      { pos: corners.BL, dir: 'bottomLeft' },
    );
  } else if (disableHorizontal && !disableVertical) {
    visibleHandles.push(
      { pos: midpoint(corners.TL, corners.TR), dir: 'top' },
      { pos: midpoint(corners.BL, corners.BR), dir: 'bottom' },
    );
  } else if (!disableHorizontal && disableVertical) {
    visibleHandles.push(
      { pos: midpoint(corners.TL, corners.BL), dir: 'left' },
      { pos: midpoint(corners.TR, corners.BR), dir: 'right' },
    );
  }

  const edgeHandles: { from: { x: number; y: number }; to: { x: number; y: number }; dir: Direction }[] = [];
  if (!disableVertical) {
    edgeHandles.push({ from: corners.TL, to: corners.TR, dir: 'top' });
    edgeHandles.push({ from: corners.BR, to: corners.BL, dir: 'bottom' });
  }
  if (!disableHorizontal) {
    edgeHandles.push({ from: corners.TR, to: corners.BR, dir: 'right' });
    edgeHandles.push({ from: corners.BL, to: corners.TL, dir: 'left' });
  }

  return (
    <>
      {visibleHandles.map((h) => (
        <div
          key={h.dir}
          data-resize-dir={h.dir}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart(h.dir, e); }}
          style={{
            position: 'fixed',
            left: h.pos.x - hitSize / 2,
            top: h.pos.y - hitSize / 2,
            width: hitSize,
            height: hitSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'all',
            cursor: getResizeCursor(h.dir, rotation),
            zIndex: 3,
          }}
        >
          <span
            aria-hidden
            style={{
              width: visualSize,
              height: visualSize,
              boxSizing: 'border-box',
              background: '#fff',
              border: `1px solid ${color}`,
              borderRadius: 0,
              pointerEvents: 'none',
            }}
          />
        </div>
      ))}

      {edgeHandles.map((edge) => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const mid = midpoint(edge.from, edge.to);
        const hitHeight = 10;
        return (
          <div
            key={`edge-${edge.dir}`}
            data-resize-edge={edge.dir}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart(edge.dir, e); }}
            style={{
              position: 'fixed',
              left: mid.x - length / 2,
              top: mid.y - hitHeight / 2,
              width: length,
              height: hitHeight,
              transform: `rotate(${angle}deg)`,
              transformOrigin: 'center center',
              pointerEvents: 'all',
              cursor: getResizeCursor(edge.dir, rotation),
              zIndex: 2,
            }}
          />
        );
      })}
    </>
  );
}
