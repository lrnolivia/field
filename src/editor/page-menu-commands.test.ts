import { describe, expect, it } from 'vitest';
import { buildPageEditorLink } from './page-menu-commands';

describe('buildPageEditorLink', () => {
  it('copies a non-home page without transient editor overlays', () => {
    expect(
      buildPageEditorLink(
        'https://admin.loew.fi/builder/site-1?settings=pages%3Aabout&cms=posts&item=1',
        'about',
      ),
    ).toBe('https://admin.loew.fi/builder/site-1?page=about');
  });

  it('copies Home without a page query parameter', () => {
    expect(
      buildPageEditorLink(
        'https://admin.loew.fi/builder/site-1?page=about&field=title',
        'home',
      ),
    ).toBe('https://admin.loew.fi/builder/site-1');
  });

  it('preserves unrelated project query state', () => {
    expect(
      buildPageEditorLink(
        'https://admin.loew.fi/builder/site-1?foo=bar&page=old',
        'contact',
      ),
    ).toBe('https://admin.loew.fi/builder/site-1?foo=bar&page=contact');
  });
});
