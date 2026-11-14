import type { ComponentPropsWithoutRef } from 'react';
import type { RulerGuide } from '@/code/project/ruler-guides-config';
import type { FrameGuideSegment } from './frame-ruler-guides';

interface Props extends Omit<ComponentPropsWithoutRef<'div'>, 'style'> {
  segment: FrameGuideSegment;
  type: RulerGuide['type'];
  color: string;
  zIndex: number;
  interactive?: boolean;
}

export function FrameRulerGuideLine({ segment, type, color, zIndex, interactive = false, ...props }: Props) {
  const { start, end } = segment;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const horizontal = type === 'horizontal';
  const rotation = Math.atan2(dy, dx) - (horizontal ? 0 : Math.PI / 2);

  return (
    <div
      {...props}
      style={{
        position: 'fixed',
        top: start.y,
        left: start.x,
        width: horizontal ? length : 1,
        height: horizontal ? 1 : length,
        transform: `rotate(${rotation}rad)`,
        transformOrigin: 'top left',
        backgroundColor: color,
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: interactive ? (horizontal ? 'row-resize' : 'col-resize') : undefined,
        zIndex,
      }}
    >
      {interactive && <div style={{ position: 'absolute', inset: horizontal ? '-4px 0' : '0 -4px' }} />}
    </div>
  );
}
