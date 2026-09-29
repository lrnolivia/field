import { animateCanvasTo } from '../transform/CameraAnimator';
import { transformManager } from '../transform/TransformManager';
import { findNodeRect } from '../node-ops';
import { stripGhostSuffix } from '@/shared/ghost-id';
import type { Transform } from '@/shared/types';
import { focusScreenRect, followScreenRect, followCaretScreenRect, getPaddedCanvasFocusArea } from '../transform/CameraCommands';

/** A temporary camera focus for typing. Canvas zoom/pan gestures keep the new
 * view; clicking away to finish editing restores the view from before typing. */
export class TextFocusCamera {
  private original: Transform | null = null;
  private interrupted = false;
  private entryFrame = 0;
  private followFrame = 0;
  private restoreFrame = 0;
  private nodeId: string | null = null;
  private vpId = 'desktop';
  private caretRect: DOMRect | null = null;

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
    // A direct text→text handoff can briefly clear isTextEditing between targets.
    // Cancel a pending restore and preserve the original pre-session camera so
    // the transition animates directly to the new text instead of bouncing out
    // to the composition view first. Manual interruption intentionally breaks
    // that chain and makes the current user-chosen camera the new baseline.
    cancelAnimationFrame(this.restoreFrame);
    this.restoreFrame = 0;
    cancelAnimationFrame(this.entryFrame);
    cancelAnimationFrame(this.followFrame);
    window.removeEventListener('wheel', this.interrupt, true);
    window.removeEventListener('mousedown', this.interruptMouse, true);
    if (!this.original || this.interrupted) this.original = transformManager.getTransform();
    this.interrupted = false;
    this.caretRect = null;
    this.nodeId = nodeId;
    this.vpId = vpId;
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
    this.scheduleFollow();
  }

  /** Fresh caret geometry arrives with every TipTap selection transaction, so
   * arrow-key navigation through oversized text can move the camera even when
   * the content itself did not change. */
  updateCaret(rect: DOMRect | null): void {
    this.caretRect = rect;
    this.scheduleFollow();
  }

  private scheduleFollow(): void {
    if (!this.original || this.interrupted || !this.nodeId) return;
    cancelAnimationFrame(this.followFrame);
    this.followFrame = requestAnimationFrame(() => {
      this.followFrame = requestAnimationFrame(() => {
        if (!this.original || this.interrupted || !this.nodeId || !this.getIframe()) return;
        const rect = findNodeRect(stripGhostSuffix(this.nodeId), this.vpId);
        if (!rect || rect.width <= 0 || rect.height <= 0) return;

        const current = transformManager.getTransform();
        const area = getPaddedCanvasFocusArea();
        const ratio = Math.min(
          1,
          (area.width * 0.82) / Math.max(1, rect.width),
          (area.height * 0.76) / Math.max(1, rect.height),
        );
        const desiredWholeObjectScale = current.scale * ratio;
        const sessionFloor = Math.min(current.scale, this.original.scale);
        const atSessionFloor = current.scale <= sessionFloor * 1.015;

        if (this.caretRect && desiredWholeObjectScale < sessionFloor && atSessionFloor) {
          followCaretScreenRect(this.caretRect);
        } else {
          // Whole-object behavior from Batch 2 stays authoritative until it would
          // need to shrink below the camera the user had before entering edit.
          followScreenRect(rect, sessionFloor);
        }
      });
    });
  }

  end(restore = true): void {
    cancelAnimationFrame(this.entryFrame);
    cancelAnimationFrame(this.followFrame);
    cancelAnimationFrame(this.restoreFrame);
    window.removeEventListener('wheel', this.interrupt, true);
    window.removeEventListener('mousedown', this.interruptMouse, true);
    const original = this.original;
    const shouldRestore = restore && original && !this.interrupted;
    this.nodeId = null;
    this.vpId = 'desktop';
    this.caretRect = null;
    this.entryFrame = 0;
    this.followFrame = 0;
    this.restoreFrame = 0;

    if (shouldRestore) {
      // One-frame grace period turns a text→text switch into one continuous
      // spatial transition. A new begin() cancels this restore and preserves the
      // original composition camera for the eventual real exit.
      this.restoreFrame = requestAnimationFrame(() => {
        this.restoreFrame = 0;
        if (this.nodeId || this.original !== original || this.interrupted) return;
        this.original = null;
        animateCanvasTo(original.x, original.y, original.scale, 320, { focus: true });
      });
    } else {
      this.original = null;
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.restoreFrame);
    this.restoreFrame = 0;
    this.end(false);
  }
}
