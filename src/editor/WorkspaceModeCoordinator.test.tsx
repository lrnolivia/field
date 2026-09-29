import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createStore, Provider, useAtomValue } from 'jotai';
import { dockedInspectorOpenAtom, dockedLeftOpenAtom, rightInspectorAutoHideAtom, rightInspectorExplicitCollapseAtom, rightInspectorTemporaryRevealAtom, rightPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { floatingLeftHiddenAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { selectedIdsAtom } from '@/code/stores/store';
import WorkspaceModeCoordinator from './WorkspaceModeCoordinator';

afterEach(() => { cleanup(); vi.useRealTimers(); });

function MountedStorageAtoms() {
  useAtomValue(workspaceModeAtom);
  useAtomValue(dockedLeftOpenAtom);
  useAtomValue(dockedInspectorOpenAtom);
  return null;
}

describe('WorkspaceModeCoordinator initialization', () => {
  it.each(['docked', 'compact-docked'] as const)('preserves independent pane choices when restoring %s', (mode) => {
    const store = createStore();
    const view = render(<Provider store={store}><MountedStorageAtoms /></Provider>);
    act(() => {
      store.set(workspaceModeAtom, mode);
      store.set(dockedLeftOpenAtom, true);
      store.set(dockedInspectorOpenAtom, false);
    });
    view.rerender(<Provider store={store}><MountedStorageAtoms /><WorkspaceModeCoordinator /></Provider>);

    expect(store.get(workspaceModeAtom)).toBe(mode);
    expect(store.get(dockedLeftOpenAtom)).toBe(true);
    expect(store.get(dockedInspectorOpenAtom)).toBe(false);
  });

  it('reveals auto-hidden sides only from their screen edges', () => {
    vi.useFakeTimers();
    const store = createStore();
    render(<Provider store={store}><WorkspaceModeCoordinator /></Provider>);
    act(() => {
      store.set(workspaceAutoHideAtom, true);
      store.set(floatingLeftHiddenAtom, true);
      store.set(rightInspectorAutoHideAtom, true);
    });
    fireEvent.pointerMove(window, { clientX: window.innerWidth / 2 });
    expect(store.get(floatingLeftHiddenAtom)).toBe(true);
    expect(store.get(rightInspectorTemporaryRevealAtom)).toBe(false);
    fireEvent.pointerMove(window, { clientX: 2 });
    expect(store.get(floatingLeftHiddenAtom)).toBe(false);
    fireEvent.pointerMove(window, { clientX: window.innerWidth - 2 });
    expect(store.get(rightInspectorTemporaryRevealAtom)).toBe(true);
    act(() => vi.advanceTimersByTime(250));
    expect(store.get(floatingLeftHiddenAtom)).toBe(true);
    fireEvent.pointerMove(window, { clientX: 2 });
    act(() => vi.advanceTimersByTime(250));
    expect(store.get(rightInspectorTemporaryRevealAtom)).toBe(false);
  });

  it('keeps a manually collapsed Inspector compact through hover and selection changes', () => {
    const store = createStore();
    render(<Provider store={store}><WorkspaceModeCoordinator /></Provider>);
    act(() => {
      store.set(workspaceModeAtom, 'floating');
      store.set(rightPaneOpenAtom, true);
      store.set(selectedIdsAtom, ['shape-a']);
      store.set(rightPaneOpenAtom, false);
    });
    expect(store.get(rightInspectorExplicitCollapseAtom)).toBe(true);
    expect(store.get(rightPaneOpenAtom)).toBe(false);
    fireEvent.pointerMove(window, { clientX: window.innerWidth - 2 });
    expect(store.get(rightPaneOpenAtom)).toBe(false);
    act(() => store.set(selectedIdsAtom, ['shape-b']));
    expect(store.get(rightPaneOpenAtom)).toBe(false);

    act(() => store.set(rightPaneOpenAtom, true));
    expect(store.get(rightInspectorExplicitCollapseAtom)).toBe(false);
    expect(store.get(rightPaneOpenAtom)).toBe(true);
  });

  it('permits edge reveal only while Inspector auto-hide is enabled', () => {
    const store = createStore();
    render(<Provider store={store}><WorkspaceModeCoordinator /></Provider>);
    act(() => {
      store.set(workspaceModeAtom, 'floating');
      store.set(rightPaneOpenAtom, false);
    });
    fireEvent.pointerMove(window, { clientX: window.innerWidth - 2 });
    expect(store.get(rightPaneOpenAtom)).toBe(false);
    act(() => {
      store.set(rightInspectorExplicitCollapseAtom, false);
      store.set(rightInspectorAutoHideAtom, true);
    });
    fireEvent.pointerMove(window, { clientX: window.innerWidth - 2 });
    expect(store.get(rightPaneOpenAtom)).toBe(true);
  });
});
