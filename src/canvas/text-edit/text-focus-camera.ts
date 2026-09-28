import { animateCanvasTo } from '../transform/CameraAnimator';
import { transformManager } from '../transform/TransformManager';
import { findNodeRect } from '../node-ops';
import { stripGhostSuffix } from '@/shared/ghost-id';
import type { Transform } from '@/shared/types';

/** A temporary camera focus for typing. Any intentional canvas interaction
 *  makes the new view the user's view, so ending the edit will not undo it. */
export class TextFocusCamera {
  private original: Transform | null = null;
  private interrupted = false;
  private pendingFrame = 0;

  constructor(private readonly getIframe: () => HTMLIFrameElement | null) {}

  private interrupt = () => {
    this.interrupted = true;
  };

  begin(nodeId: string, vpId: string): void {
    this.end(false);
    this.interrupted = false;
    this.original = transformManager.getTransform();
    window.addEventListener('pointerdown', this.interrupt, true);
    window.addEventListener('wheel', this.interrupt, true);
    document.addEventListener('field:sandbox-mousedown', this.interrupt, true);
    // A newly inserted text node can take a render frame to acquire a rect.
    const focus = (attempt: number) => {
      if (!this.original || this.interrupted) return;
      if (!this.getIframe()) return;
      const rect = findNodeRect(stripGhostSuffix(nodeId), vpId);
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        if (attempt < 8) this.pendingFrame = requestAnimationFrame(() => focus(attempt + 1));
        return;
      }
      const current = transformManager.getTransform();
      const canvasX = (rect.left + rect.width / 2 - current.x) / current.scale;
      const canvasY = (rect.top + rect.height / 2 - current.y) / current.scale;
      const maxForWidth = (window.innerWidth * 0.72) / (rect.width / current.scale);
      // A wide text box used to cap the target at the current zoom, so typing
      // looked like a sudden pan with no focus change. Permit a modest minimum
      // zoom even when the box itself is wider than the viewing strip.
      const scale = Math.min(3, Math.max(current.scale * 1.32, Math.min(current.scale * 2.05, maxForWidth)));
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      animateCanvasTo(centerX - canvasX * scale, centerY - canvasY * scale, scale, 540, { focus: true });
    };
    this.pendingFrame = requestAnimationFrame(() => focus(0));
  }

  end(restore = true): void {
    cancelAnimationFrame(this.pendingFrame);
    window.removeEventListener('pointerdown', this.interrupt, true);
    window.removeEventListener('wheel', this.interrupt, true);
    document.removeEventListener('field:sandbox-mousedown', this.interrupt, true);
    const original = this.original;
    const shouldRestore = restore && original && !this.interrupted;
    this.original = null;
    if (shouldRestore) {
      animateCanvasTo(original.x, original.y, original.scale, 480, { focus: true });
    }
  }

  dispose(): void {
    this.end(false);
  }
}
