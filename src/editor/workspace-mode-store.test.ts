import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { compactInspectorOpenAtom, dockedInspectorOpenAtom, dockedLeftOpenAtom, leftPaneOpenAtom, rightPaneOpenAtom, rightPaneDetachedAtom } from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from './detached-left-panel-store';
import { compactPanelOpenAtom, floatingEntranceAtom, floatingInspectorRevealedAtom, floatingInspectorVisibleAtom, floatingLeftHiddenAtom, floatingPanelCollapsedAtom, leftRailVisibleAtom, railRevealedAtom, setWorkspaceModeAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { selectedIdsAtom } from '@/code/stores/store';

describe('workspace mode', () => {
  it('moves both sides together through docked, floating, and compact', () => {
    const store = createStore();
    store.set(leftPanelAtom, 'layers');

    store.set(setWorkspaceModeAtom, 'floating');
    expect(store.get(workspaceModeAtom)).toBe('floating');
    expect(store.get(leftPaneOpenAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(false);
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

  it('keeps the compact rail visible and separates panel collapse from auto-hide', () => {
    const store = createStore();
    store.set(setWorkspaceModeAtom, 'floating');
    expect(store.get(leftRailVisibleAtom)).toBe(true);
    store.set(workspaceAutoHideAtom, true);
    store.set(floatingPanelCollapsedAtom, true);
    expect(store.get(leftRailVisibleAtom)).toBe(true);
    store.set(floatingLeftHiddenAtom, true);
    expect(store.get(leftRailVisibleAtom)).toBe(false);
    store.set(workspaceAutoHideAtom, false);
    expect(store.get(leftRailVisibleAtom)).toBe(true);
    store.set(workspaceAutoHideAtom, true);
    store.set(setWorkspaceModeAtom, 'compact');
    expect(store.get(leftRailVisibleAtom)).toBe(true);
    expect(store.get(compactPanelOpenAtom)).toBe(false);
    store.set(railRevealedAtom, true);
    store.set(compactPanelOpenAtom, true);
    expect(store.get(leftRailVisibleAtom)).toBe(true);
    store.set(setWorkspaceModeAtom, 'docked');
    expect(store.get(leftRailVisibleAtom)).toBe(true);
    store.set(floatingLeftHiddenAtom, true);
    expect(store.get(leftRailVisibleAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
    store.set(floatingLeftHiddenAtom, false);
    expect(store.get(leftRailVisibleAtom)).toBe(true);
  });

  it('auto-shows the floating inspector for a selection', () => {
    const store = createStore();
    store.set(setWorkspaceModeAtom, 'floating');
    expect(store.get(floatingEntranceAtom)).toBe(true);
    expect(store.get(floatingInspectorVisibleAtom)).toBe(true);
    store.set(workspaceAutoHideAtom, true);
    store.set(floatingInspectorRevealedAtom, false);
    expect(store.get(floatingInspectorVisibleAtom)).toBe(false);
    store.set(selectedIdsAtom, ['shape-1']);
    expect(store.get(floatingInspectorVisibleAtom)).toBe(true);
    store.set(selectedIdsAtom, []);
    expect(store.get(floatingInspectorVisibleAtom)).toBe(false);
  });

  it('reveals the Inspector temporarily without leaving Compact mode', () => {
    const store = createStore();
    store.set(setWorkspaceModeAtom, 'compact');
    store.set(compactInspectorOpenAtom, true);
    expect(store.get(workspaceModeAtom)).toBe('compact');
    expect(store.get(leftPaneOpenAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
    expect(store.get(rightPaneDetachedAtom)).toBe(true);
    store.set(compactInspectorOpenAtom, false);
    expect(store.get(rightPaneOpenAtom)).toBe(false);
  });

  it('shares independently persisted pane state across Default and Compact Docked', () => {
    const store = createStore();
    store.set(setWorkspaceModeAtom, 'compact-docked');
    expect(store.get(leftRailVisibleAtom)).toBe(true);
    expect(store.get(leftPaneOpenAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(false);
    expect(store.get(rightPaneDetachedAtom)).toBe(false);
    store.set(leftPaneOpenAtom, true);
    expect(store.get(leftPaneOpenAtom)).toBe(true);
    expect(store.get(rightPaneOpenAtom)).toBe(false);
    store.set(rightPaneOpenAtom, true);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
    expect(store.get(workspaceModeAtom)).toBe('compact-docked');
    store.set(leftPaneOpenAtom, false);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
    store.set(setWorkspaceModeAtom, 'docked');
    expect(store.get(leftPaneOpenAtom)).toBe(true);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
    store.set(rightPaneOpenAtom, false);
    expect(store.get(leftPaneOpenAtom)).toBe(true);
    expect(store.get(workspaceModeAtom)).toBe('docked');
    store.set(setWorkspaceModeAtom, 'compact-docked');
    expect(store.get(leftPaneOpenAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(false);
  });

  it('does not reseed independent pane states when the saved preset is restored', () => {
    const store = createStore();
    store.set(workspaceModeAtom, 'compact-docked');
    store.set(dockedLeftOpenAtom, true);
    store.set(dockedInspectorOpenAtom, false);
    expect(store.get(leftPaneOpenAtom)).toBe(true);
    expect(store.get(rightPaneOpenAtom)).toBe(false);
    expect(store.get(workspaceModeAtom)).toBe('compact-docked');
  });
});
