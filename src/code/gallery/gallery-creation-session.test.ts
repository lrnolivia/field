import { afterEach, describe, expect, it, vi } from 'vitest';

const history = vi.hoisted(() => ({
  holdHistoryCoalescing: vi.fn(),
  releaseHistoryCoalescing: vi.fn(),
}));

vi.mock('@/code/mutation/history', () => history);

import {
  claimGalleryCreationSession,
  completeGalleryCreationSession,
  isEmptyGalleryInsertionPayload,
  registerFreshGalleryInsertion,
} from './gallery-creation-session';
import { GALLERY_VIEW_STYLE_PROPERTY } from './gallery-views';

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('Gallery creation session', () => {
  it('recognizes only the canonical empty Gallery insertion payload', () => {
    expect(isEmptyGalleryInsertionPayload([
      { styles: { [GALLERY_VIEW_STYLE_PROPERTY]: 'grid' }, children: [] },
    ])).toBe(true);
    expect(isEmptyGalleryInsertionPayload([
      { styles: { [GALLERY_VIEW_STYLE_PROPERTY]: 'grid' }, children: ['media'] },
    ])).toBe(false);
    expect(isEmptyGalleryInsertionPayload([{ styles: {}, children: [] }])).toBe(false);
  });

  it('holds history from insertion through Finish or Cancel', () => {
    registerFreshGalleryInsertion('gallery-a');
    expect(history.holdHistoryCoalescing).toHaveBeenCalledTimes(1);
    expect(claimGalleryCreationSession('gallery-a')).toBe(true);
    expect(history.releaseHistoryCoalescing).not.toHaveBeenCalled();
    completeGalleryCreationSession('gallery-a');
    expect(history.releaseHistoryCoalescing).toHaveBeenCalledTimes(1);
  });

  it('releases an unclaimed insertion instead of freezing global history', () => {
    vi.useFakeTimers();
    registerFreshGalleryInsertion('gallery-timeout');
    vi.advanceTimersByTime(5001);
    expect(history.releaseHistoryCoalescing).toHaveBeenCalledTimes(1);
    expect(claimGalleryCreationSession('gallery-timeout')).toBe(false);
  });

  it('keeps one shared history hold until all creation sessions close', () => {
    registerFreshGalleryInsertion('gallery-b');
    registerFreshGalleryInsertion('gallery-c');
    expect(history.holdHistoryCoalescing).toHaveBeenCalledTimes(1);
    completeGalleryCreationSession('gallery-b');
    expect(history.releaseHistoryCoalescing).not.toHaveBeenCalled();
    completeGalleryCreationSession('gallery-c');
    expect(history.releaseHistoryCoalescing).toHaveBeenCalledTimes(1);
  });
});
