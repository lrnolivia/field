import { describe, expect, it } from 'vitest';
import {
  deriveWorkspaceLayout,
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
    expect(layout.right.inset).toBe(24);
    expect(layout.cameraInsets.right).toBe(0);
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
