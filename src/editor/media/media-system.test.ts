import { describe, expect, it } from 'vitest';
import {
  acceptedMimeTypes,
  createMediaSession,
  intentForLauncherAction,
  mediaIntentAllowsMultiSelect,
  mediaKindFromMime,
  routeForLauncherAction,
} from './media-system';

describe('media system routing', () => {
  it('opens the launcher by default', () => {
    expect(createMediaSession()).toMatchObject({
      surface: 'toolbar',
      intent: 'browse',
      route: { view: 'launcher', kind: 'all' },
      search: '',
      selectedIds: [],
    });
  });

  it('deep-links launcher actions into one media model', () => {
    expect(routeForLauncherAction('image')).toEqual({ view: 'browser', kind: 'image' });
    expect(routeForLauncherAction('video')).toEqual({ view: 'browser', kind: 'video' });
    expect(routeForLauncherAction('audio')).toEqual({ view: 'browser', kind: 'audio' });
    expect(routeForLauncherAction('gallery')).toEqual({ view: 'create', kind: 'image', provider: 'gallery' });
    expect(intentForLauncherAction('gallery')).toBe('gallery');
  });

  it('keeps gallery as an intent rather than a media kind', () => {
    expect(mediaIntentAllowsMultiSelect('gallery')).toBe(true);
    expect(routeForLauncherAction('gallery').kind).toBe('image');
  });

  it('maps upload MIME types deterministically', () => {
    expect(mediaKindFromMime('image/jpeg')).toBe('image');
    expect(mediaKindFromMime('image/svg+xml')).toBe('vector');
    expect(mediaKindFromMime('video/mp4')).toBe('video');
    expect(mediaKindFromMime('audio/mpeg')).toBe('audio');
    expect(mediaKindFromMime('application/pdf')).toBeNull();
    expect(acceptedMimeTypes('all')).toContain('video/*');
  });
});
