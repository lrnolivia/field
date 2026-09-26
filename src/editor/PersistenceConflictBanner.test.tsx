import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import PersistenceConflictBanner, { openLatestProjectCopy } from './PersistenceConflictBanner';
import { persistenceConflictAtom, type PersistenceConflictState } from '@/backend/persistence-conflict';

const conflict: PersistenceConflictState = {
  projectId: 'project-1',
  detectedAt: 123,
  message: 'Your edits are still in this tab, but saving is paused.',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderConflict(overrides: { onOpenLatest?: () => void; onReloadLatest?: () => void } = {}) {
  const store = createStore();
  store.set(persistenceConflictAtom, conflict);
  render(
    <Provider store={store}>
      <PersistenceConflictBanner {...overrides} />
    </Provider>,
  );
  return store;
}

describe('PersistenceConflictBanner', () => {
  it('renders only while a first-class conflict state exists', () => {
    const empty = createStore();
    const view = render(
      <Provider store={empty}>
        <PersistenceConflictBanner />
      </Provider>,
    );
    expect(view.container.querySelector('[data-persistence-conflict]')).toBeNull();
    view.unmount();

    renderConflict();
    expect(screen.getByText('Project changed elsewhere')).toBeTruthy();
    expect(screen.getByText('Your edits are still in this tab, but saving is paused.')).toBeTruthy();
  });

  it('opens the current project URL with safe new-tab semantics', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    openLatestProjectCopy();
    expect(open).toHaveBeenCalledWith(window.location.href, '_blank', 'noopener,noreferrer');
  });

  it('Open latest leaves the stale tab conflict state untouched', () => {
    const onOpenLatest = vi.fn();
    const store = renderConflict({ onOpenLatest });

    fireEvent.click(screen.getByRole('button', { name: 'Open latest' }));

    expect(onOpenLatest).toHaveBeenCalledTimes(1);
    expect(store.get(persistenceConflictAtom)).toEqual(conflict);
  });

  it('Reload latest requires destructive confirmation and cancel preserves local state', () => {
    const onReloadLatest = vi.fn();
    const store = renderConflict({ onReloadLatest });

    fireEvent.click(screen.getByRole('button', { name: 'Reload latest' }));
    const root = screen.getByText('Reload latest version?').closest('[data-modal-root]');
    expect(root).toBeTruthy();
    expect(screen.getByText(/Reloading will discard those local edits/)).toBeTruthy();

    fireEvent.click(within(root as HTMLElement).getByRole('button', { name: 'Cancel' }));
    expect(onReloadLatest).not.toHaveBeenCalled();
    expect(store.get(persistenceConflictAtom)).toEqual(conflict);
  });

  it('confirmed Reload latest performs the supplied full-reload action', () => {
    const onReloadLatest = vi.fn();
    renderConflict({ onReloadLatest });

    fireEvent.click(screen.getByRole('button', { name: 'Reload latest' }));
    const root = screen.getByText('Reload latest version?').closest('[data-modal-root]');
    expect(root).toBeTruthy();
    fireEvent.click(within(root as HTMLElement).getByRole('button', { name: 'Reload latest' }));

    expect(onReloadLatest).toHaveBeenCalledTimes(1);
  });
});
