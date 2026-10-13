// left-panel-store.test.ts — Tests for left panel state management.

import { describe, test, expect, vi } from 'vitest';
import { createStore } from 'jotai';
import { leftPanelAtom, togglePanelAtom, DEFAULT_LEFT_PANEL } from '@/code/stores/left-panel-store';
import { leftPaneOpenAtom } from '@/code/stores/workspace-panels-store';

// Mock trace
vi.mock('@/shared/debug-trace', () => ({
  trace: { action: vi.fn(), fn: vi.fn(), error: vi.fn() },
}));

describe('leftPanelAtom', () => {
  test('the builder opens on Layers', () => {
    // Layers is the home panel — it is what you reach for on almost every
    // edit, while Pages is a navigation action taken once per session.
    const store = createStore();
    expect(store.get(leftPanelAtom)).toBe('layers');
    expect(DEFAULT_LEFT_PANEL).toBe('layers');
  });
});

describe('togglePanelAtom', () => {
  test('switches to a different panel', () => {
    const store = createStore();
    store.set(togglePanelAtom, 'insert');
    expect(store.get(leftPanelAtom)).toBe('insert');
  });

  test('clicking the active rail item collapses and reopens that panel', () => {
    const store = createStore();
    store.set(togglePanelAtom, 'insert');
    expect(store.get(leftPanelAtom)).toBe('insert');

    // Click insert again → keep its selection, close its content pane.
    store.set(togglePanelAtom, 'insert');
    expect(store.get(leftPanelAtom)).toBe('insert');
    expect(store.get(leftPaneOpenAtom)).toBe(false);
    store.set(togglePanelAtom, 'insert');
    expect(store.get(leftPaneOpenAtom)).toBe(true);
  });

  test('clicking the home panel while on it collapses it', () => {
    const store = createStore();
    expect(store.get(leftPanelAtom)).toBe(DEFAULT_LEFT_PANEL);
    store.set(togglePanelAtom, DEFAULT_LEFT_PANEL);
    expect(store.get(leftPanelAtom)).toBe(DEFAULT_LEFT_PANEL);
    expect(store.get(leftPaneOpenAtom)).toBe(false);
  });

  test('Pages remains reachable and the Layers rail returns to Layers', () => {
    const store = createStore();
    store.set(togglePanelAtom, 'pages-layers');
    expect(store.get(leftPanelAtom)).toBe('pages-layers');
    store.set(togglePanelAtom, 'layers');
    expect(store.get(leftPanelAtom)).toBe(DEFAULT_LEFT_PANEL);
    expect(store.get(leftPaneOpenAtom)).toBe(true);
  });

  test('clicking another rail item reopens the pane directly there', () => {
    const store = createStore();
    store.set(leftPaneOpenAtom, false);
    store.set(togglePanelAtom, 'library');
    expect(store.get(leftPanelAtom)).toBe('library');
    expect(store.get(leftPaneOpenAtom)).toBe(true);
  });

  test('switches between different panels', () => {
    const store = createStore();
    store.set(togglePanelAtom, 'media');
    expect(store.get(leftPanelAtom)).toBe('media');

    store.set(togglePanelAtom, 'library');
    expect(store.get(leftPanelAtom)).toBe('library');

    store.set(togglePanelAtom, 'cms');
    expect(store.get(leftPanelAtom)).toBe('cms');
  });

  test('all panel IDs are valid', () => {
    const store = createStore();
    const panels = ['insert', 'pages-layers', 'layers', 'library', 'media', 'locale', 'cms'] as const;

    for (const panel of panels) {
      store.set(togglePanelAtom, panel);
      expect(store.get(leftPanelAtom)).toBe(panel);
    }
  });
});
