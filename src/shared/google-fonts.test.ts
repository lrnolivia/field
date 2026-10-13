import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_FONTS,
  fetchGoogleFontsFromSource,
  mapGoogleFontsCatalog,
  resolveGoogleFontsCatalogSource,
} from './google-fonts';

describe('Google Fonts catalog source', () => {
  test('normal hosted field production uses the field Worker endpoint', () => {
    expect(resolveGoogleFontsCatalogSource({
      cloudEnabled: false,
      isDev: false,
      forceLocal: false,
    })).toEqual({ kind: 'field', url: '/api/field/fonts' });
  });

  test('Revyme Cloud preserves the Revyme proxy', () => {
    expect(resolveGoogleFontsCatalogSource({
      cloudEnabled: true,
      isDev: false,
      forceLocal: false,
    })).toEqual({ kind: 'revyme', url: '/api/media/fonts' });
  });

  test('local development without a key remains on DEFAULT_FONTS', async () => {
    const source = resolveGoogleFontsCatalogSource({
      cloudEnabled: false,
      isDev: true,
      forceLocal: false,
    });
    expect(source).toEqual({ kind: 'fallback', url: null });
    expect(await fetchGoogleFontsFromSource(source)).toBe(DEFAULT_FONTS);
  });

  test('a developer-owned direct key is local-only and requests popularity + FAMILY_TAGS', () => {
    const source = resolveGoogleFontsCatalogSource({
      cloudEnabled: false,
      isDev: true,
      forceLocal: false,
      apiKey: 'local-key',
    });
    expect(source.kind).toBe('direct');
    const url = new URL(source.url!);
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/webfonts/v1/webfonts');
    expect(url.searchParams.get('key')).toBe('local-key');
    expect(url.searchParams.get('sort')).toBe('popularity');
    expect(url.searchParams.get('capability')).toBe('FAMILY_TAGS');
  });
});

describe('Google Fonts catalog behavior', () => {
  test('maps family, variants, category, and tags into FontItem', () => {
    expect(mapGoogleFontsCatalog({
      items: [{
        family: 'Momo Trust Display',
        variants: ['regular', '700'],
        category: 'display',
        tags: [{ name: 'Expressive', weight: 900 }],
      }],
    })).toEqual([{
      family: 'Momo Trust Display',
      variants: ['regular', '700'],
      category: 'display',
      tags: [{ name: 'Expressive', weight: 900 }],
    }]);
  });

  test('non-OK catalog response falls back to DEFAULT_FONTS', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 502 })) as unknown as typeof fetch;
    const fonts = await fetchGoogleFontsFromSource({ kind: 'field', url: '/api/field/fonts' }, fetchImpl);
    expect(fonts).toBe(DEFAULT_FONTS);
  });

  test('malformed catalog response falls back to DEFAULT_FONTS', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ nope: true })) as unknown as typeof fetch;
    const fonts = await fetchGoogleFontsFromSource({ kind: 'field', url: '/api/field/fonts' }, fetchImpl);
    expect(fonts).toBe(DEFAULT_FONTS);
  });

  test('the Workspace divider names the external catalog Google Fonts', () => {
    const popupSource = readFileSync(resolve(process.cwd(), 'src/editor/ui/FontFamilyPopup.tsx'), 'utf8');
    expect(popupSource).toContain('              Google Fonts\n');
    expect(popupSource).not.toContain('              All fonts\n');
  });
});
