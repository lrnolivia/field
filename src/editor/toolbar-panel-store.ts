import { atom } from 'jotai';
import type { LibrarySection } from '@/editor/library-focus-store';
import type { InsertCategory } from '@/shared/insert-items/element-data';
import type { MediaIntent, MediaRoute } from '@/editor/media/media-system';

export type ToolbarPanel =
  | { kind: 'library'; section: LibrarySection }
  | { kind: 'insert'; category: string; section?: string; categoryData?: InsertCategory }
  | { kind: 'media'; route?: MediaRoute; intent?: MediaIntent }
  | { kind: 'media-gallery' };

export const toolbarPanelAtom = atom<ToolbarPanel | null>(null);
