import type { SaveStatus } from '@/backend/save-store';

export interface ThumbnailCaptureScheduleInput {
  isFieldBackend: boolean;
  suspended: boolean;
  mainBranchActive: boolean;
  saveStatus: SaveStatus;
  captureActive: boolean;
  needsInitialCapture: boolean | null;
  generation: number;
  lastSuccessfulGeneration: number;
  lastFailedGeneration: number;
}

/** Pure scheduling gate for the hidden Preview capture host.
 *
 * Thumbnail work may PREWARM while persistence is unsaved/saving so the
 * expensive Preview boot overlaps the autosave debounce. Publishing still
 * remains gated on `saveStatus === 'saved'` inside the host. A persistence
 * error is the only save state that blocks background preparation entirely.
 */
export function shouldScheduleThumbnailCapture(input: ThumbnailCaptureScheduleInput): boolean {
  if (!input.isFieldBackend) return false;
  if (input.suspended || !input.mainBranchActive || input.captureActive) return false;
  if (input.saveStatus === 'error') return false;

  const changedSinceSuccess = input.generation > input.lastSuccessfulGeneration;
  const failedThisGeneration = input.generation === input.lastFailedGeneration;
  const needsWork = input.needsInitialCapture === true || changedSinceSuccess;
  return needsWork && !failedThisGeneration;
}
