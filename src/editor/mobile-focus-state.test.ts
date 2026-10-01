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
