import { describe, expect, it } from 'vitest';
import { shouldScheduleThumbnailCapture } from './project-thumbnail-capture-state';

const base = {
  isFieldBackend: true,
  suspended: false,
  mainBranchActive: true,
  saveStatus: 'saved' as const,
  captureActive: false,
  needsInitialCapture: true as boolean | null,
  generation: 0,
  lastSuccessfulGeneration: 0,
  lastFailedGeneration: -1,
};

describe('dashboard thumbnail capture scheduling', () => {
  it('backfills a missing or stale thumbnail after the project is saved', () => {
    expect(shouldScheduleThumbnailCapture(base)).toBe(true);
  });

  it('recaptures after a later project mutation even when the old thumbnail was fresh', () => {
    expect(shouldScheduleThumbnailCapture({
      ...base,
      needsInitialCapture: false,
      generation: 4,
      lastSuccessfulGeneration: 3,
    })).toBe(true);
  });

  it('waits during unsaved work, visible Preview, and non-main branches', () => {
    expect(shouldScheduleThumbnailCapture({ ...base, saveStatus: 'unsaved' })).toBe(false);
    expect(shouldScheduleThumbnailCapture({ ...base, suspended: true })).toBe(false);
    expect(shouldScheduleThumbnailCapture({ ...base, mainBranchActive: false })).toBe(false);
  });

  it('does not spin on a failed generation and resumes after the next change', () => {
    expect(shouldScheduleThumbnailCapture({ ...base, lastFailedGeneration: 0 })).toBe(false);
    expect(shouldScheduleThumbnailCapture({
      ...base,
      needsInitialCapture: true,
      generation: 1,
      lastFailedGeneration: 0,
    })).toBe(true);
  });
});
