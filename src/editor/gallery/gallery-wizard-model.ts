import type { GalleryFrameSizing } from '@/code/gallery/gallery-frame-sizing';
import type { GalleryViewId } from '@/code/gallery/gallery-views';

export type GalleryWizardFit = 'cover' | 'contain';
export type GalleryWizardStep = 'media' | 'layout' | 'behavior';

export interface GalleryWizardConfig {
  mediaUrls: string[];
  view: GalleryViewId;
  frameSizing: GalleryFrameSizing;
  fit: GalleryWizardFit;
  naturalSeed: number;
}

export function appendGalleryWizardMedia(current: readonly string[], incoming: readonly string[]): string[] {
  const next = [...current];
  for (const url of incoming) {
    if (url && !next.includes(url)) next.push(url);
  }
  return next;
}

export function removeGalleryWizardMedia(current: readonly string[], index: number): string[] {
  if (index < 0 || index >= current.length) return [...current];
  return current.filter((_, itemIndex) => itemIndex !== index);
}

export function moveGalleryWizardMedia(current: readonly string[], index: number, delta: -1 | 1): string[] {
  const target = index + delta;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) return [...current];
  const next = [...current];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
