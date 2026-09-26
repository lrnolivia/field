import { describe, expect, it } from 'vitest';
import { createStore } from 'jotai';
import { creatorToolsLockedAtom, isCreatorToolMode, toolModeAtom } from './tool-store';

describe('Scale tool mode', () => {
  it('is first-class but not a creator tool', () => {
    expect(isCreatorToolMode('scale' as any)).toBe(false);
    const store = createStore();
    store.set(creatorToolsLockedAtom, true);
    store.set(toolModeAtom, 'scale' as any);
    expect(store.get(toolModeAtom)).toBe('scale');
  });
});
