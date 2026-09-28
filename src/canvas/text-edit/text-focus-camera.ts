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
  private blurTimer = 0;
  private iframe: HTMLIFrameElement | null = null;

  constructor(private readonly getIframe: () => HTMLIFrameElement | null) {}

  private interrupt = () => {
    this.interrupted = true;
  };

  private blurPulse(): void {
    const iframe = this.getIframe();
    if (!iframe || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.iframe = iframe;
    window.clearTimeout(this.blurTimer);
    iframe.style.transition = 'filter 260ms ease-out';
    iframe.style.filter = 'blur(3px)';
    this.blurTimer = window.setTimeout(() => {
      iframe.style.filter = '';
    }, 35);
  }

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
      const rect = findNodeRect(stripGhostSuffix(nodeId), vpId);
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        if (attempt < 8) this.pendingFrame = requestAnimationFrame(() => focus(attempt + 1));
        return;
      }
      const current = transformManager.getTransform();
      const canvasX = (rect.left + rect.width / 2 - current.x) / current.scale;
      const canvasY = (rect.top + rect.height / 2 - current.y) / current.scale;
      const maxForWidth = (window.innerWidth * 0.55) / (rect.width / current.scale);
      const scale = Math.max(current.scale, Math.min(2.4, current.scale * 1.55, maxForWidth));
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.blurPulse();
      animateCanvasTo(centerX - canvasX * scale, centerY - canvasY * scale, scale, 420);
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
      this.blurPulse();
      animateCanvasTo(original.x, original.y, original.scale, 420);
    }
  }

  dispose(): void {
    this.end(false);
    window.clearTimeout(this.blurTimer);
    if (this.iframe) {
      this.iframe.style.filter = '';
      this.iframe.style.transition = '';
    }
  }
}
