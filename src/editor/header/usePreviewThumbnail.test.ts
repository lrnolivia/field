import { describe, it, expect } from 'vitest';
import { shouldCaptureThumbnail } from './usePreviewThumbnail';

describe('shouldCaptureThumbnail', () => {
  it('captures the dashboard Page when nothing was captured before', () => {
    expect(shouldCaptureThumbnail({ isThumbnailPage: true, lastCapturedVersion: null, currentVersion: 1 })).toBe(true);
  });

  it('captures when the project version moved forward', () => {
    expect(shouldCaptureThumbnail({ isThumbnailPage: true, lastCapturedVersion: 3, currentVersion: 4 })).toBe(true);
  });

  it('captures when the version moved backward (undo)', () => {
    expect(shouldCaptureThumbnail({ isThumbnailPage: true, lastCapturedVersion: 5, currentVersion: 4 })).toBe(true);
  });

  it('skips when the dashboard Page version is unchanged', () => {
    expect(shouldCaptureThumbnail({ isThumbnailPage: true, lastCapturedVersion: 4, currentVersion: 4 })).toBe(false);
  });

  it('never lets another page overwrite the project card', () => {
    expect(shouldCaptureThumbnail({ isThumbnailPage: false, lastCapturedVersion: null, currentVersion: 1 })).toBe(false);
    expect(shouldCaptureThumbnail({ isThumbnailPage: false, lastCapturedVersion: 3, currentVersion: 9 })).toBe(false);
  });
});
