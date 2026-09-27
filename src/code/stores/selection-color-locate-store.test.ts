import { describe, expect, it } from 'vitest';
import { createStore } from 'jotai';
import { locateSelectionColor, selectionColorLocateAtom } from './selection-color-locate-store';

describe('transient Selection color locate state', () => {
  it('deduplicates node ids, differentiates hover/click, and replays repeated clicks', () => {
    const store = createStore();
    const hover = locateSelectionColor(['a', 'a', 'b'], '#ff0000', 'hover');
    store.set(selectionColorLocateAtom, hover);
    expect(store.get(selectionColorLocateAtom)?.nodeIds).toEqual(['a', 'b']);
    const first = locateSelectionColor(['a'], '#ff0000', 'click');
    const second = locateSelectionColor(['a'], '#ff0000', 'click');
    expect(second.revision).toBeGreaterThan(first.revision);
    expect(first.mode).toBe('click');
  });
});
