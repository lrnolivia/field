import { atom } from 'jotai';
import type { LibrarySection } from '@/editor/library-focus-store';

export type ToolbarPanel =
  | { kind: 'library'; section: LibrarySection }
  | { kind: 'insert'; category: string; section?: string }
  | { kind: 'media-gallery' };

export const toolbarPanelAtom = atom<ToolbarPanel | null>(null);
