// src/canvas/hooks/useCanvasTouchInteraction.test.ts

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  SINGLE_TOUCH_PAN_THRESHOLD_PX,
  TOUCH_MARQUEE_HOLD_MS,
  shouldStartSingleTouchPan,
  singleTouchPanDelta,
} from './useCanvasTouchInteraction';

describe('mobile single-touch interaction helpers', () => {
  it('keeps tap jitter below the empty-canvas pan threshold', () => {
    expect(shouldStartSingleTouchPan(SINGLE_TOUCH_PAN_THRESHOLD_PX - 1, 0)).toBe(false);
    expect(shouldStartSingleTouchPan(0, SINGLE_TOUCH_PAN_THRESHOLD_PX - 1)).toBe(false);
    expect(shouldStartSingleTouchPan(SINGLE_TOUCH_PAN_THRESHOLD_PX, 0)).toBe(true);
  });

  it('returns screen-space pan deltas', () => {
    expect(singleTouchPanDelta({ x: 10, y: 20 }, { x: 17, y: 14 }))
      .toEqual({ dx: 7, dy: -6 });
  });

  it('keeps deliberate touch marquee behind a real long press', () => {
    expect(TOUCH_MARQUEE_HOLD_MS).toBeGreaterThanOrEqual(350);
    expect(TOUCH_MARQUEE_HOLD_MS).toBeLessThanOrEqual(600);
  });
});

describe('mobile touch wiring contract', () => {
  const root = process.cwd();
  const canvas = fs.readFileSync(path.resolve(root, 'src/canvas/Canvas.tsx'), 'utf8');
  const selection = fs.readFileSync(path.resolve(root, 'src/canvas/selection/SelectionBox.tsx'), 'utf8');
  const mouse = fs.readFileSync(path.resolve(root, 'src/canvas/mouse/CanvasMouseController.ts'), 'utf8');

  it('wires the one-finger controller into Canvas', () => {
    expect(canvas).toContain("import { useCanvasTouchInteraction } from './hooks/useCanvasTouchInteraction'");
    expect(canvas).toContain('useCanvasTouchInteraction({');
    expect(canvas).toContain("getToolMode: () => jotaiStore.get(toolModeAtom)");
  });

  it('keeps touch out of desktop marquee selection', () => {
    expect(selection).toContain("detail.pointerType === 'touch'");
  });

  it('has a deterministic deferred-state cancellation seam', () => {
    expect(mouse).toContain('cancelTouchInteraction(): void');
    expect(mouse).toContain('this.pendingMultiSelectChild = null');
    expect(mouse).toContain('this.pendingShiftRemove = null');
  });

  it('routes deliberate long-press marquee through canonical SelectionBox', () => {
    const source = fs.readFileSync(
      path.resolve(root, 'src/canvas/hooks/useCanvasTouchInteraction.ts'),
      'utf8',
    );
    expect(source).toContain("TOUCH_MARQUEE_START_EVENT = 'field:touch-marquee-start'");
    expect(source).toContain("TOUCH_MARQUEE_MOVE_EVENT = 'field:touch-marquee-move'");
    expect(selection).toContain("document.addEventListener('field:touch-marquee-start'");
    expect(selection).toContain("document.addEventListener('field:touch-marquee-move'");
    expect(selection).toContain("document.addEventListener('field:touch-marquee-end'");
  });
});


describe('mobile software-keyboard bridge', () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), 'src/canvas/hooks/useCanvasTouchInteraction.ts'),
    'utf8',
  );
  const canvas = fs.readFileSync(path.resolve(process.cwd(), 'src/canvas/Canvas.tsx'), 'utf8');

  it('primes a real editable control synchronously when touch starts text edit', () => {
    expect(source).toContain('data-field-mobile-keyboard-primer');
    expect(source).toContain('primer.focus({ preventScroll: true })');
    expect(source).toContain('!wasTextEditing && isTextEditing()');
  });

  it('reads live text-edit state from the canonical editor atom', () => {
    expect(canvas).toContain('isTextEditing: () => jotaiStore.get(isTextEditingAtom)');
  });
});
