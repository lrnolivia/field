import { animateCanvasTo } from '../transform/CameraAnimator';
import { transformManager } from '../transform/TransformManager';
import { findNodeRect } from '../node-ops';
import { stripGhostSuffix } from '@/shared/ghost-id';
import type { Transform } from '@/shared/types';
import { focusScreenRect } from '../transform/CameraCommands';

/** A temporary camera focus for typing. Canvas zoom/pan gestures keep the new
 * view; clicking away to finish editing restores the view from before typing. */
export class TextFocusCamera {
  private original: Transform | null = null;
  private interrupted = false;
  private pendingFrame = 0;

  constructor(
    private readonly getIframe: () => HTMLIFrameElement | null,
    private readonly isCanvasWheel: (event: WheelEvent) => boolean,
  ) {}

  private interrupt = (event: WheelEvent) => {
    if (this.isCanvasWheel(event)) this.interrupted = true;
  };

  begin(nodeId: string, vpId: string): void {
    this.end(false);
    this.interrupted = false;
    this.original = transformManager.getTransform();
    window.addEventListener('wheel', this.interrupt, true);
    // A newly inserted text node can take a render frame to acquire a rect.
    const focus = (attempt: number) => {
      if (!this.original || this.interrupted) return;
      if (!this.getIframe()) return;
      const rect = findNodeRect(stripGhostSuffix(nodeId), vpId);
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        if (attempt < 8) this.pendingFrame = requestAnimationFrame(() => focus(attempt + 1));
        return;
      }
      focusScreenRect(rect, 'text-edit');
    };
    this.pendingFrame = requestAnimationFrame(() => focus(0));
  }

  end(restore = true): void {
    cancelAnimationFrame(this.pendingFrame);
    window.removeEventListener('wheel', this.interrupt, true);
    const original = this.original;
    const shouldRestore = restore && original && !this.interrupted;
    this.original = null;
    if (shouldRestore) {
      animateCanvasTo(original.x, original.y, original.scale, 320, { focus: true });
    }
  }

  dispose(): void {
    this.end(false);
  }
}
