import { atom } from 'jotai';

export interface PersistenceConflictState {
  projectId: string;
  detectedAt: number;
  message: string;
}

export const PERSISTENCE_CONFLICT_MESSAGE =
  'Your edits are still in this tab, but saving is paused.';

export const persistenceConflictAtom = atom<PersistenceConflictState | null>(null);

export function createPersistenceConflictState(
  projectId: string,
  detectedAt = Date.now(),
): PersistenceConflictState {
  return {
    projectId,
    detectedAt,
    message: PERSISTENCE_CONFLICT_MESSAGE,
  };
}
