import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  clampRightFloatingHeight,
  clampRightFloatingOffset,
  deriveWorkspaceLayout,
  resolveRightFloatingHeight,
  resolveLeftFloatingHeight,
  WORKSPACE_BOTTOM_TOOLBAR_BOTTOM,
  WORKSPACE_FLOAT_INSET,
} from './workspace-layout';
import {
  LEFT_WORKSPACE_WIDTH,
  RIGHT_PANE_WIDTH,
  LEFT_RAIL_WIDTH,
  MIN_LEFT_CONTENT_WIDTH,
  MAX_RIGHT_PANE_WIDTH,
} from '@/code/stores/workspace-panels-store';

describe('deriveWorkspaceLayout', () => {
  it('docks both panes when both are visible', () => {
    const layout = deriveWorkspaceLayout(true, true);
    expect(layout.left.presentation).toBe('docked');
    expect(layout.right.presentation).toBe('docked');
    expect(layout.left.inset).toBe(0);
    expect(layout.right.inset).toBe(0);
    expect(layout.cameraInsets).toEqual({
      left: LEFT_WORKSPACE_WIDTH,
      top: 0,
      right: RIGHT_PANE_WIDTH,
      bottom: 0,
    });
  });

  it('keeps the left workspace docked when right is collapsed', () => {
    const layout = deriveWorkspaceLayout(true, false);
    expect(layout.left.presentation).toBe('docked');
    expect(layout.right.presentation).toBe('hidden');
    expect(layout.left.inset).toBe(0);
    expect(layout.left.top).toBe(0);
    expect(layout.left.bottom).toBe(0);
    expect(layout.cameraInsets.left).toBe(LEFT_WORKSPACE_WIDTH);
    expect(layout.cameraInsets.right).toBe(0);
  });

  it('keeps the right workspace docked when left is collapsed', () => {
    const layout = deriveWorkspaceLayout(false, true);
    expect(layout.left.presentation).toBe('hidden');
    expect(layout.right.presentation).toBe('docked');
    expect(layout.right.inset).toBe(0);
    expect(layout.cameraInsets.left).toBe(0);
    expect(layout.cameraInsets.right).toBe(RIGHT_PANE_WIDTH);
  });

  it('uses live pane widths without silently floating either side', () => {
    const layout = deriveWorkspaceLayout(true, false, {
      leftContentWidth: 333,
      rightPaneWidth: 377,
    });
    expect(layout.left.presentation).toBe('docked');
    expect(layout.left.width).toBe(LEFT_RAIL_WIDTH + 333);
    expect(layout.right.width).toBe(377);
    expect(layout.cameraInsets.left).toBe(LEFT_RAIL_WIDTH + 333);
  });

  it('clamps persisted pane widths to the professional-tool bounds', () => {
    const layout = deriveWorkspaceLayout(true, true, {
      leftContentWidth: 1,
      rightPaneWidth: 9999,
    });
    expect(layout.left.width).toBe(LEFT_RAIL_WIDTH + MIN_LEFT_CONTENT_WIDTH);
    expect(layout.right.width).toBe(MAX_RIGHT_PANE_WIDTH);
  });

  it('floats the inspector only when explicitly detached', () => {
    const layout = deriveWorkspaceLayout(true, true, { rightDetached: true });
    expect(layout.left.presentation).toBe('docked');
    expect(layout.right.presentation).toBe('floating');
    expect(layout.right.inset).toBe(12);
    expect(layout.cameraInsets.right).toBe(0);
  });

  it('auto-sizes the floating Inspector to the bottom edge of the toolbar', () => {
    const viewportHeight = 900;
    const height = resolveRightFloatingHeight(viewportHeight, 680);
    expect(height).toBe(viewportHeight - WORKSPACE_FLOAT_INSET - WORKSPACE_BOTTOM_TOOLBAR_BOTTOM);
    expect(WORKSPACE_FLOAT_INSET + height).toBe(viewportHeight - WORKSPACE_BOTTOM_TOOLBAR_BOTTOM);
  });

  it('preserves explicit floating Inspector height while enforcing edge margins', () => {
    expect(resolveRightFloatingHeight(900, 540)).toBe(540);
    expect(clampRightFloatingHeight(900, 1200, 6)).toBe(870);
  });

  it('resolves short and rotated viewports without mutating saved floating heights', () => {
    expect(resolveLeftFloatingHeight(390, 680)).toBe(310);
    expect(resolveLeftFloatingHeight(900, 680)).toBe(680);
    expect(resolveLeftFloatingHeight(70, 680)).toBe(0);
    expect(resolveRightFloatingHeight(390, -1)).toBe(360);
    expect(resolveRightFloatingHeight(900, 540, 200)).toBe(540);
    expect(resolveRightFloatingHeight(390, 540, 50)).toBe(316);
  });

  it('clamps a moved floating Inspector inside the 12px viewport margins', () => {
    const viewportWidth = 1200;
    const viewportHeight = 900;
    const paneWidth = 328;
    const paneHeight = resolveRightFloatingHeight(viewportHeight, 680);

    expect(clampRightFloatingOffset(viewportWidth, viewportHeight, paneWidth, paneHeight, { x: 200, y: -80 }))
      .toEqual({ x: 0, y: 0 });

    const far = clampRightFloatingOffset(viewportWidth, viewportHeight, paneWidth, paneHeight, { x: -5000, y: 5000 });
    expect(viewportWidth - WORKSPACE_FLOAT_INSET - paneWidth + far.x).toBe(WORKSPACE_FLOAT_INSET);
    expect(WORKSPACE_FLOAT_INSET + paneHeight + far.y).toBe(viewportHeight - WORKSPACE_FLOAT_INSET);
  });

  it('leaves a canvas-first workspace when both panes are hidden', () => {
    const layout = deriveWorkspaceLayout(false, false);
    expect(layout.left.presentation).toBe('hidden');
    expect(layout.right.presentation).toBe('hidden');
    expect(layout.cameraInsets).toEqual({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    });
  });
});


describe('floating Inspector drag contract', () => {
  it('treats the viewport padding as a hard margin instead of an edge-dock trigger', async () => {
    const source = await import('node:fs/promises').then(({ readFile }) =>
      readFile(resolve(process.cwd(), 'src/editor/header/RightHeader.tsx'), 'utf8'),
    );
    expect(source).toContain('clampRightFloatingOffset(');
    expect(source).not.toContain("setWorkspaceMode('docked')");
    expect(source).not.toContain('latestX >= -12');
  });
});
