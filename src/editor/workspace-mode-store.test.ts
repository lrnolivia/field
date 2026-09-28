import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { leftPaneOpenAtom, rightPaneOpenAtom, rightPaneDetachedAtom } from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from './detached-left-panel-store';
import { dockedRailCollapsedAtom, leftRailVisibleAtom, railRevealedAtom, setWorkspaceModeAtom, workspaceModeAtom } from './workspace-mode-store';

describe('workspace mode', () => {
  it('moves both sides together through docked, floating, and compact', () => {
    const store = createStore();
    store.set(leftPanelAtom, 'layers');

    store.set(setWorkspaceModeAtom, 'floating');
    expect(store.get(workspaceModeAtom)).toBe('floating');
    expect(store.get(leftPaneOpenAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
    expect(store.get(rightPaneDetachedAtom)).toBe(true);
    expect(store.get(detachedLeftPanelAtom)?.panelId).toBe('layers');

    store.set(setWorkspaceModeAtom, 'compact');
    expect(store.get(leftPaneOpenAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(false);
    expect(store.get(rightPaneDetachedAtom)).toBe(false);
    expect(store.get(detachedLeftPanelAtom)).toBeNull();

    store.set(setWorkspaceModeAtom, 'docked');
    expect(store.get(leftPaneOpenAtom)).toBe(true);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
    expect(store.get(rightPaneDetachedAtom)).toBe(false);
    expect(store.get(detachedLeftPanelAtom)).toBeNull();
  });

  it('hides the floating rail and keeps docked rail compaction independent', () => {
    const store = createStore();
    store.set(setWorkspaceModeAtom, 'floating');
    expect(store.get(leftRailVisibleAtom)).toBe(false);
    store.set(railRevealedAtom, true);
    expect(store.get(leftRailVisibleAtom)).toBe(true);
    store.set(setWorkspaceModeAtom, 'docked');
    expect(store.get(leftRailVisibleAtom)).toBe(true);
    store.set(dockedRailCollapsedAtom, true);
    expect(store.get(leftRailVisibleAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
    store.set(railRevealedAtom, true);
    expect(store.get(leftRailVisibleAtom)).toBe(true);
  });

  it('cannot restore contradictory legacy pane flags', () => {
    const store = createStore();
    store.set(setWorkspaceModeAtom, 'floating');
    store.set(leftPaneOpenAtom, true);
    expect(store.get(workspaceModeAtom)).toBe('docked');
    expect(store.get(rightPaneDetachedAtom)).toBe(false);
    store.set(rightPaneOpenAtom, false);
    expect(store.get(workspaceModeAtom)).toBe('compact');
    expect(store.get(leftPaneOpenAtom)).toBe(false);
  });
});
