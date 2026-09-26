const gallerySelectionMemory = new Map<string, string>();

export function rememberGalleryItemSelection(galleryId: string, itemId: string | null): void {
  if (!galleryId) return;
  if (itemId) gallerySelectionMemory.set(galleryId, itemId);
  else gallerySelectionMemory.delete(galleryId);
}

export function resolveGalleryItemSelection(
  galleryId: string,
  itemIds: readonly string[],
  currentItemId: string | null,
): string | null {
  if (currentItemId && itemIds.includes(currentItemId)) return currentItemId;
  const remembered = gallerySelectionMemory.get(galleryId);
  if (remembered && itemIds.includes(remembered)) return remembered;
  return itemIds[0] ?? null;
}

export function gallerySelectionAfterRemove(
  itemIds: readonly string[],
  removedItemId: string,
  currentItemId: string | null,
): string | null {
  if (currentItemId !== removedItemId) {
    return currentItemId && itemIds.includes(currentItemId) ? currentItemId : null;
  }
  const removedIndex = itemIds.indexOf(removedItemId);
  if (removedIndex < 0) return null;
  return itemIds[removedIndex + 1] ?? itemIds[removedIndex - 1] ?? null;
}
