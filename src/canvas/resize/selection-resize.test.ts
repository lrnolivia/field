import { describe, expect, it } from 'vitest';
import { planSelectionResize, type SelectionResizeMember } from './selection-resize';

// Audit fixture (100% camera): rectangle (48,128) 160x120 and nested Frame
// (400,350) 250x200 share one parent, so screen == local here.
const rect: SelectionResizeMember = { left: 48, top: 128, width: 160, height: 120, screenCenter: { x: 128, y: 188 } };
const frame: SelectionResizeMember = { left: 400, top: 350, width: 250, height: 200, screenCenter: { x: 525, y: 450 } };
const startBox = { x: 48, y: 128, width: 602, height: 422 };

describe('planSelectionResize', () => {
  it('maps every member through one anchor-preserving scale (bottom-right)', () => {
    const plan = planSelectionResize({
      startBox, direction: 'bottomRight', dx: 60.2, dy: 42.2, keepRatio: false, scale: 1, members: [rect, frame],
    })!;
    expect(plan.sx).toBeCloseTo(1.1, 6);
    expect(plan.sy).toBeCloseTo(1.1, 6);
    const [r, f] = plan.members;
    // Top-left anchor stays put for the member that touches it.
    expect(r.left).toBeCloseTo(48, 6);
    expect(r.top).toBeCloseTo(128, 6);
    expect(r.width).toBeCloseTo(176, 6);
    expect(r.height).toBeCloseTo(132, 6);
    // The far member's POSITION scales across the shared bounds too.
    expect(f.left).toBeCloseTo(48 + (400 - 48) * 1.1, 6);
    expect(f.top).toBeCloseTo(128 + (350 - 128) * 1.1, 6);
    expect(f.width).toBeCloseTo(275, 6);
    expect(f.height).toBeCloseTo(220, 6);
    // Members still exactly fill the resized selection box.
    expect(f.left + f.width).toBeCloseTo(plan.box.x + plan.box.width, 6);
    expect(f.top + f.height).toBeCloseTo(plan.box.y + plan.box.height, 6);
  });

  it('pins the opposite corner for a top-left handle', () => {
    const plan = planSelectionResize({
      startBox, direction: 'topLeft', dx: 60.2, dy: 42.2, keepRatio: false, scale: 1, members: [rect, frame],
    })!;
    const [, f] = plan.members;
    expect(f.left + f.width).toBeCloseTo(650, 6);
    expect(f.top + f.height).toBeCloseTo(550, 6);
    expect(plan.box.x).toBeCloseTo(108.2, 6);
  });

  it('edge handles scale only their own axis', () => {
    const plan = planSelectionResize({
      startBox, direction: 'right', dx: 60.2, dy: 999, keepRatio: true, scale: 1, members: [rect, frame],
    })!;
    expect(plan.sx).toBeCloseTo(1.1, 6);
    expect(plan.sy).toBe(1);
    expect(plan.members[1].top).toBeCloseTo(350, 6);
    expect(plan.members[1].height).toBeCloseTo(200, 6);
  });

  it('Shift on a corner keeps the selection ratio', () => {
    const plan = planSelectionResize({
      startBox, direction: 'bottomRight', dx: 120.4, dy: 0, keepRatio: true, scale: 1, members: [rect, frame],
    })!;
    expect(plan.sx).toBeCloseTo(1.2, 6);
    expect(plan.sy).toBeCloseTo(1.2, 6);
  });

  it('converts screen movement to local px through the camera scale', () => {
    const at2x = [rect, frame].map((m) => ({
      ...m,
      screenCenter: { x: m.screenCenter.x * 2, y: m.screenCenter.y * 2 },
    }));
    const plan = planSelectionResize({
      startBox: { x: 96, y: 256, width: 1204, height: 844 },
      direction: 'bottomRight', dx: 120.4, dy: 84.4, keepRatio: false, scale: 2, members: at2x,
    })!;
    expect(plan.members[1].left).toBeCloseTo(48 + (400 - 48) * 1.1, 6);
    expect(plan.members[1].width).toBeCloseTo(275, 6);
  });

  it('keeps a rotated member rigidly placed by mapping its painted centre', () => {
    // 100x40 box rotated 90deg about its centre: painted centre (50,20).
    const rotated: SelectionResizeMember = { left: 0, top: 0, width: 100, height: 40, screenCenter: { x: 50, y: 20 } };
    const plan = planSelectionResize({
      startBox: { x: 30, y: -30, width: 40, height: 100 },
      direction: 'bottomRight', dx: 40, dy: 100, keepRatio: false, scale: 1, members: [rotated],
    })!;
    const m = plan.members[0];
    expect(m.left + m.width / 2).toBeCloseTo(30 + (50 - 30) * 2, 6);
    expect(m.top + m.height / 2).toBeCloseTo(-30 + (20 + 30) * 2, 6);
  });

  it('refuses a degenerate start box', () => {
    expect(planSelectionResize({
      startBox: { x: 0, y: 0, width: 0, height: 10 }, direction: 'right', dx: 5, dy: 0, keepRatio: false, scale: 1, members: [],
    })).toBeNull();
  });
});
