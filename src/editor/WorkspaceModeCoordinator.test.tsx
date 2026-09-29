import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createStore, Provider, useAtomValue } from 'jotai';
import { dockedInspectorOpenAtom, dockedLeftOpenAtom } from '@/code/stores/workspace-panels-store';
import { workspaceModeAtom } from './workspace-mode-store';
import WorkspaceModeCoordinator from './WorkspaceModeCoordinator';

afterEach(cleanup);

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
});
