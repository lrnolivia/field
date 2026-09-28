import { atom } from 'jotai';
import type { LibrarySection } from '@/editor/library-focus-store';
import type { InsertCategory } from '@/shared/insert-items/element-data';

export type ToolbarPanel =
  | { kind: 'library'; section: LibrarySection }
  | { kind: 'insert'; category: string; section?: string; categoryData?: InsertCategory }
  | { kind: 'media-gallery' }
  | { kind: 'media-picker'; media: 'image' | 'video' }
  | { kind: 'gallery-picker' }
  | { kind: 'audio-picker' };

export const toolbarPanelAtom = atom<ToolbarPanel | null>(null);
