import { animateCanvasTo } from '../transform/CameraAnimator';
import { transformManager } from '../transform/TransformManager';
import { findNodeRect } from '../node-ops';
import { stripGhostSuffix } from '@/shared/ghost-id';
import type { Transform } from '@/shared/types';
import { focusScreenRect, followScreenRect } from '../transform/CameraCommands';

/** A temporary camera focus for typing. Canvas zoom/pan gestures keep the new
 * view; clicking away to finish editing restores the view from before typing. */
export class TextFocusCamera {
  private original: Transform | null = null;
  private interrupted = false;
  private entryFrame = 0;
  private followFrame = 0;
  private nodeId: string | null = null;
  private vpId = 'desktop';

  constructor(
    private readonly getIframe: () => HTMLIFrameElement | null,
    private readonly isCanvasWheel: (event: WheelEvent) => boolean,
  ) {}

  private markInterrupted(): void {
    this.interrupted = true;
    cancelAnimationFrame(this.followFrame);
    this.followFrame = 0;
  }

  private interrupt = (event: WheelEvent) => {
    if (this.isCanvasWheel(event)) this.markInterrupted();
  };

  private interruptMouse = (event: MouseEvent) => {
    // Middle-mouse is the canvas's direct pan gesture. Reuse the same hit-test
    // callback (it only reads target/client coordinates) so a deliberate pan
    // suspends adaptive follow just like wheel/trackpad camera motion.
    if (event.button === 1 && this.isCanvasWheel(event as unknown as WheelEvent)) this.markInterrupted();
  };

  begin(nodeId: string, vpId: string): void {
    this.end(false);
    this.interrupted = false;
    this.nodeId = nodeId;
    this.vpId = vpId;
    this.original = transformManager.getTransform();
    window.addEventListener('wheel', this.interrupt, true);
    window.addEventListener('mousedown', this.interruptMouse, true);
    // A newly inserted text node can take a render frame to acquire a rect.
    const focus = (attempt: number) => {
      if (!this.original || this.interrupted) return;
      if (!this.getIframe()) return;
      const rect = findNodeRect(stripGhostSuffix(nodeId), vpId);
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        if (attempt < 8) this.entryFrame = requestAnimationFrame(() => focus(attempt + 1));
        return;
      }
      focusScreenRect(rect, 'text-edit');
    };
    this.entryFrame = requestAnimationFrame(() => focus(0));
  }

  /** Called from the sandbox's live text-change stream. Double-RAF lets the
   * sandbox ResizeObserver publish the post-reflow rect before we inspect it. */
  update(): void {
    if (!this.original || this.interrupted || !this.nodeId) return;
    cancelAnimationFrame(this.followFrame);
    this.followFrame = requestAnimationFrame(() => {
      this.followFrame = requestAnimationFrame(() => {
        if (!this.original || this.interrupted || !this.nodeId || !this.getIframe()) return;
        const rect = findNodeRect(stripGhostSuffix(this.nodeId), this.vpId);
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        followScreenRect(rect);
      });
    });
  }

  end(restore = true): void {
    cancelAnimationFrame(this.entryFrame);
    cancelAnimationFrame(this.followFrame);
    window.removeEventListener('wheel', this.interrupt, true);
    window.removeEventListener('mousedown', this.interruptMouse, true);
    const original = this.original;
    const shouldRestore = restore && original && !this.interrupted;
    this.original = null;
    this.nodeId = null;
    this.vpId = 'desktop';
    this.entryFrame = 0;
    this.followFrame = 0;
    if (shouldRestore) {
      animateCanvasTo(original.x, original.y, original.scale, 320, { focus: true });
    }
  }

  dispose(): void {
    this.end(false);
  }
}
