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

/** Pure scheduling gate for the hidden Preview capture host. */
export function shouldScheduleThumbnailCapture(input: ThumbnailCaptureScheduleInput): boolean {
  if (!input.isFieldBackend) return false;
  if (input.suspended || !input.mainBranchActive || input.captureActive) return false;
  if (input.saveStatus !== 'saved') return false;

  const changedSinceSuccess = input.generation > input.lastSuccessfulGeneration;
  const failedThisGeneration = input.generation === input.lastFailedGeneration;
  const needsWork = input.needsInitialCapture === true || changedSinceSuccess;
  return needsWork && !failedThisGeneration;
}
