import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { mobileFocusActiveAtom, workspaceModeAtom, workspaceModePreferenceAtom, leftPaneOpenAtom, dockedLeftOpenAtom, rightPaneOpenAtom, dockedInspectorOpenAtom } from '@/code/stores/workspace-panels-store';

describe('phone Focus preserves desktop state', () => {
  it('derives Focus without writing the saved mode or pane choices', () => {
    const store = createStore();
    store.set(mobileFocusActiveAtom, false);
    store.set(workspaceModePreferenceAtom, 'docked');
    store.set(dockedLeftOpenAtom, true);
    store.set(dockedInspectorOpenAtom, true);
    store.set(mobileFocusActiveAtom, true);
    expect(store.get(workspaceModeAtom)).toBe('floating');
    expect(store.get(leftPaneOpenAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(false);
    store.set(workspaceModeAtom, 'compact-docked');
    expect(store.get(workspaceModePreferenceAtom)).toBe('docked');
    store.set(mobileFocusActiveAtom, false);
    expect(store.get(workspaceModeAtom)).toBe('docked');
    expect(store.get(leftPaneOpenAtom)).toBe(true);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
  });
  it('retains regular workspace mode changes', () => {
    const store = createStore();
    store.set(mobileFocusActiveAtom, false);
    store.set(workspaceModeAtom, 'compact-docked');
    expect(store.get(workspaceModePreferenceAtom)).toBe('compact-docked');
    expect(store.get(workspaceModeAtom)).toBe('compact-docked');
  });
});

it('mobile Inspector opening and closing preserves desktop auto-hide', async () => {
  const { rightInspectorAutoHideAtom } = await import('@/code/stores/workspace-panels-store');
  const store = createStore();
  store.set(mobileFocusActiveAtom, false);
  store.set(workspaceModePreferenceAtom, 'docked');
  store.set(rightInspectorAutoHideAtom, true);
  store.set(mobileFocusActiveAtom, true);
  store.set(rightPaneOpenAtom, true);
  expect(store.get(rightInspectorAutoHideAtom)).toBe(true);
  store.set(rightPaneOpenAtom, false);
  expect(store.get(rightInspectorAutoHideAtom)).toBe(true);
  store.set(mobileFocusActiveAtom, false);
  expect(store.get(workspaceModeAtom)).toBe('docked');
  expect(store.get(rightInspectorAutoHideAtom)).toBe(true);
});

 it('mobile Float and Focus never overwrite saved desktop panes or mode', async () => {
  const { setWorkspaceModeAtom } = await import('./workspace-mode-store');
  const store = createStore();
  store.set(mobileFocusActiveAtom, false);
  store.set(workspaceModePreferenceAtom, 'docked');
  store.set(dockedLeftOpenAtom, true);
  store.set(dockedInspectorOpenAtom, true);
  store.set(mobileFocusActiveAtom, true);
  store.set(setWorkspaceModeAtom, 'compact-docked');
  expect(store.get(workspaceModeAtom)).toBe('compact');
  store.set(rightPaneOpenAtom, true);
  expect(store.get(rightPaneOpenAtom)).toBe(true);
  store.set(setWorkspaceModeAtom, 'floating');
  expect(store.get(workspaceModeAtom)).toBe('floating');
  store.set(setWorkspaceModeAtom, 'docked');
  expect(store.get(workspaceModeAtom)).toBe('floating');
  store.set(mobileFocusActiveAtom, false);
  expect(store.get(workspaceModeAtom)).toBe('docked');
  expect(store.get(dockedLeftOpenAtom)).toBe(true);
  expect(store.get(dockedInspectorOpenAtom)).toBe(true);
});
