import { describe, expect, it } from 'vitest';
import { appendUniqueMedia, chooseMedia, toggleMediaSelection } from './media-selection';

describe('Gallery media selection helpers', () => {
  it('toggles URLs without creating duplicates', () => {
    expect(toggleMediaSelection(['/a.jpg'], '/b.jpg')).toEqual(['/a.jpg', '/b.jpg']);
    expect(toggleMediaSelection(['/a.jpg', '/b.jpg'], '/a.jpg')).toEqual(['/b.jpg']);
  });

  it('appends an uploaded canonical URL only once', () => {
    expect(appendUniqueMedia(['/a.jpg'], '/b.jpg')).toEqual(['/a.jpg', '/b.jpg']);
    expect(appendUniqueMedia(['/a.jpg', '/b.jpg'], '/b.jpg')).toEqual(['/a.jpg', '/b.jpg']);
  });

  it('preserves ImageSearchModal single-image behavior by default', () => {
    expect(chooseMedia('single', ['/pending.jpg'], '/picked.jpg')).toEqual({
      selectedUrls: ['/pending.jpg'],
      directUrl: '/picked.jpg',
      close: true,
    });
  });

  it('keeps Gallery multiple mode open and updates pending selection', () => {
    expect(chooseMedia('multiple', ['/a.jpg'], '/b.jpg')).toEqual({
      selectedUrls: ['/a.jpg', '/b.jpg'],
      directUrl: null,
      close: false,
    });
  });
});
