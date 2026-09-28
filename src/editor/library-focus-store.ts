import { atom } from 'jotai';

export type LibrarySection = 'components' | 'vectors' | 'templates' | 'code-overrides' | 'plugins';

export const libraryFocusAtom = atom<{ section: LibrarySection; requestId: number } | null>(null);
