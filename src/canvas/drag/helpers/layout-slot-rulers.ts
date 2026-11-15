import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { invertProjective, solveHomography } from '@/canvas/creators/creator-utils';
import { getViewportPrefix } from '@/canvas/node-ops';
import { frameGuideSegment } from '@/canvas/ui/frame-ruler-guides';
import type { PostMessageBridge } from '@/canvas-sandbox/bridge-host';
import { getFrameRulerGuideSnapLines } from '@/code/stores/ruler-guides-store';
import type { SnapGuide } from '@/shared/types';
import type { DragMoveResult } from '../types';

type Axis = 'x' | 'y';
type Measurement = {
  id: string;
  slot: number;
  viewportId: string;
  frames: readonly string[];
  axis?: Axis;
};

/** Show guides for the slot CSS painted, without changing insertion or placement. */
export class LayoutSlotRulers {
  private measured: Measurement | null = null;
  private guides: SnapGuide[] = [];

  constructor(private readonly publish?: (guides: SnapGuide[]) => void) {}

  get snap(): DragMoveResult['snap'] {
    return this.guides.length
      ? { x: 0, y: 0, snappedX: false, snappedY: false, guides: this.guides, spacingGuides: [] }
      : null;
  }

  clear(): void {
    if (this.guides.length) this.publish?.([]);
    this.measured = null;
    this.guides = [];
  }

  measure(id: string, slot: number, viewportId: string, frames: string[], axis?: Axis): void {
    if (!id || !frames.length || !this.publish) return;
    const bridge = getCanvasBridge();
    if (!('getFlowSlotGeometry' in bridge)) return;
    const prev = this.measured;
    if (prev?.id === id && prev.slot === slot && prev.viewportId === viewportId && prev.frames === frames && prev.axis === axis) return;
    this.clear();
    const measurement = { id, slot, viewportId, frames, axis };
    this.measured = measurement;

    // Read after the placeholder patch. The single sandbox task samples the
    // slot and its ancestors at the same layout and camera state.
    void (bridge as PostMessageBridge).getFlowSlotGeometry(id, getViewportPrefix(viewportId), frames).then(sample => {
      if (this.measured !== measurement) return;
      if (!sample) {
        this.measured = null;
        return;
      }

      const { TL, TR, BR, BL } = sample.slot;
      const edges = { x: [[TL, BL], [TR, BR]], y: [[TL, TR], [BL, BR]] };
      this.guides = sample.frames.flatMap(({ id: frameId, width, height, corners }) => {
        const map = solveHomography(width, height, corners.TL, corners.TR, corners.BR, corners.BL);
        const inverse = invertProjective(map);
        if (!inverse) return [];
        const geometry = { width, height, map, toLocal: inverse.invertScreen };
        return getFrameRulerGuideSnapLines(frameId, viewportId, geometry).flatMap(line => {
          if (axis && line.axis !== axis) return [];
          const segment = frameGuideSegment(geometry, line.axis === 'x' ? 'vertical' : 'horizontal', line.position);
          if (!segment) return [];
          const dx = segment.end.x - segment.start.x;
          const dy = segment.end.y - segment.start.y;
          const length = Math.hypot(dx, dy);
          if (!length) return [];
          const crossAxis = line.axis === 'x' ? 'y' : 'x';
          const extent = crossAxis === 'x' ? width : height;
          // Require both endpoints within one source and screen pixel, and
          // an overlap between the slot edge and the finite ruler segment.
          const aligned = edges[line.axis].some(edge => {
            const [first, last] = edge.map(p => geometry.toLocal(p.x, p.y));
            if (!edge.every(p => Math.abs(dx * (p.y - segment.start.y) - dy * (p.x - segment.start.x)) <= length)) return false;
            if ([first, last].some(p => !(Math.abs(p[line.axis] - line.position) <= 1))) return false;
            return Math.max(first[crossAxis], last[crossAxis]) > 0 && Math.min(first[crossAxis], last[crossAxis]) < extent;
          });
          return aligned ? [{ axis: line.axis, position: line.position, type: 'edge' as const, referenceId: `ruler-guide:${line.id}` }] : [];
        });
      });
      this.publish?.(this.guides);
    }).catch(() => {
      if (this.measured === measurement) this.measured = null;
    });
  }
}
