import { RESIZE_HANDLE_SIZE, SELECTION_COLOR } from '@/shared/constants';
import type { ScreenCorners } from '@/canvas/resize/geometry-utils';
import type { ScaleCornerDirection } from '@/canvas/scale/scale-math';
import { getResizeCursor } from '@/canvas/resize/cursor-utils';

interface Props {
  corners: ScreenCorners;
  rotation: number;
  onScaleStart: (direction: ScaleCornerDirection, e: React.PointerEvent) => void;
  color?: string;
}

/** Scale deliberately exposes corners only: the operation is uniform/proportional. */
export default function ScaleHandles({ corners, rotation, onScaleStart, color = SELECTION_COLOR }: Props) {
  const visualSize = Math.max(7, RESIZE_HANDLE_SIZE);
  const hitSize = Math.max(16, RESIZE_HANDLE_SIZE + 8);
  const handles: Array<{ pos: { x: number; y: number }; dir: ScaleCornerDirection }> = [
    { pos: corners.TL, dir: 'topLeft' },
    { pos: corners.TR, dir: 'topRight' },
    { pos: corners.BR, dir: 'bottomRight' },
    { pos: corners.BL, dir: 'bottomLeft' },
  ];

  return <>{handles.map(h => (
    <div
      key={h.dir}
      data-scale-dir={h.dir}
      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onScaleStart(h.dir, e); }}
      style={{
        position: 'fixed', left: h.pos.x - hitSize / 2, top: h.pos.y - hitSize / 2,
        width: hitSize, height: hitSize, display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'all', cursor: getResizeCursor(h.dir, rotation), zIndex: 3,
      }}
    >
      <span aria-hidden style={{
        width: visualSize, height: visualSize, boxSizing: 'border-box', background: '#fff',
        border: `1px solid ${color}`, borderRadius: 999, pointerEvents: 'none',
      }} />
    </div>
  ))}</>;
}
