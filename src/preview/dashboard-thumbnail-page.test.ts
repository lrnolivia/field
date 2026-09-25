import { describe, expect, it } from 'vitest';
import { chooseDashboardThumbnailPage, dashboardThumbnailPageUrl } from './dashboard-thumbnail-page';

describe('dashboard thumbnail Page authority', () => {
  it('uses Home even when another route sorts before it', () => {
    expect(chooseDashboardThumbnailPage([
      'app/about/page.client.tsx',
      'app/(Body)/page.client.tsx',
      'app/zebra/page.client.tsx',
    ])).toBe('app/(Body)/page.client.tsx');
  });

  it('falls back to the first static route alphabetically', () => {
    expect(chooseDashboardThumbnailPage([
      'app/team/[slug]/page.client.tsx',
      'app/zebra/page.client.tsx',
      'app/about/page.client.tsx',
    ])).toBe('app/about/page.client.tsx');
  });

  it('can fall back to a dynamic-only project and ignores non-pages', () => {
    expect(chooseDashboardThumbnailPage([
      'components/Hero.tsx',
      'app/zoo/[id]/page.client.tsx',
      'app/blog/[slug]/page.client.tsx',
    ])).toBe('app/blog/[slug]/page.client.tsx');
    expect(chooseDashboardThumbnailPage(['components/Hero.tsx'])).toBeNull();
  });

  it('maps the chosen Page to the Preview route', () => {
    expect(dashboardThumbnailPageUrl('app/page.client.tsx')).toBe('/');
    expect(dashboardThumbnailPageUrl('app/(Body)/about/page.client.tsx')).toBe('/about');
  });
});
