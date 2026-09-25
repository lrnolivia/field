import { describe, expect, it } from 'vitest';
import {
  deriveWorkspaceLayout,
  WORKSPACE_FLOAT_INSET,
} from './workspace-layout';
import { LEFT_WORKSPACE_WIDTH, RIGHT_PANE_WIDTH } from '@/code/stores/workspace-panels-store';

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

  it('floats the left workspace when right is hidden', () => {
    const layout = deriveWorkspaceLayout(true, false);
    expect(layout.left.presentation).toBe('floating');
    expect(layout.right.presentation).toBe('hidden');
    expect(layout.left.inset).toBe(WORKSPACE_FLOAT_INSET);
    expect(layout.left.top).toBe(WORKSPACE_FLOAT_INSET);
    expect(layout.left.bottom).toBe(WORKSPACE_FLOAT_INSET);
    expect(layout.cameraInsets.left).toBe(LEFT_WORKSPACE_WIDTH + WORKSPACE_FLOAT_INSET);
    expect(layout.cameraInsets.right).toBe(0);
  });

  it('floats the right workspace when left is hidden', () => {
    const layout = deriveWorkspaceLayout(false, true);
    expect(layout.left.presentation).toBe('hidden');
    expect(layout.right.presentation).toBe('floating');
    expect(layout.right.inset).toBe(WORKSPACE_FLOAT_INSET);
    expect(layout.cameraInsets.left).toBe(0);
    expect(layout.cameraInsets.right).toBe(RIGHT_PANE_WIDTH + WORKSPACE_FLOAT_INSET);
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
