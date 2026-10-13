export type MediaSelectionMode = 'single' | 'multiple';

export function toggleMediaSelection(selected: readonly string[], url: string): string[] {
  return selected.includes(url)
    ? selected.filter((item) => item !== url)
    : [...selected, url];
}

export function appendUniqueMedia(selected: readonly string[], url: string): string[] {
  return selected.includes(url) ? [...selected] : [...selected, url];
}

export interface MediaPickDecision {
  selectedUrls: string[];
  /** Non-null only for the historical single-image flow. */
  directUrl: string | null;
  close: boolean;
}

/**
 * One pure decision point for ImageSearchModal's single-vs-multiple contract.
 * Existing callers must keep the historical behavior: choose one URL and close.
 * Gallery's multiple mode instead toggles pending selection and keeps browsing.
 */
export function chooseMedia(
  mode: MediaSelectionMode,
  selected: readonly string[],
  url: string,
): MediaPickDecision {
  if (mode === 'single') {
    return { selectedUrls: [...selected], directUrl: url, close: true };
  }
  return {
    selectedUrls: toggleMediaSelection(selected, url),
    directUrl: null,
    close: false,
  };
}
