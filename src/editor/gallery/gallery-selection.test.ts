import { describe, expect, it } from 'vitest';
import {
  gallerySelectionAfterRemove,
  rememberGalleryItemSelection,
  resolveGalleryItemSelection,
} from './gallery-selection';

describe('Gallery selection continuity', () => {
  it('restores remembered media identity after an inspector remount', () => {
    rememberGalleryItemSelection('gallery-a', null);
    rememberGalleryItemSelection('gallery-a', 'item-b');

    expect(resolveGalleryItemSelection('gallery-a', ['item-a', 'item-b', 'item-c'], null)).toBe('item-b');
    expect(resolveGalleryItemSelection('gallery-a', ['item-c', 'item-b', 'item-a'], null)).toBe('item-b');
  });

  it('keeps current identity across reorder and ignores stale remembered IDs', () => {
    rememberGalleryItemSelection('gallery-b', 'stale');
    expect(resolveGalleryItemSelection('gallery-b', ['item-c', 'item-a'], 'item-a')).toBe('item-a');
    expect(resolveGalleryItemSelection('gallery-b', ['item-c', 'item-a'], null)).toBe('item-c');
  });

  it('chooses the next adjacent item after selected removal, then previous at the end', () => {
    const items = ['a', 'b', 'c'];
    expect(gallerySelectionAfterRemove(items, 'b', 'b')).toBe('c');
    expect(gallerySelectionAfterRemove(items, 'c', 'c')).toBe('b');
    expect(gallerySelectionAfterRemove(items, 'a', 'b')).toBe('b');
    expect(gallerySelectionAfterRemove(['a'], 'a', 'a')).toBeNull();
  });
});
