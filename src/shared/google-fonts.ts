// google-fonts.ts -- Fetch Google Fonts catalog with category tags.
// Caches at module level (fetch once per session). Falls back to system fonts if API fails.

import { trace } from './debug-trace';
import { CLOUD_ENABLED } from './cloud-flag';

export interface FontItem {
  family: string;
  variants: string[];
  category: string;
  tags: { name: string; weight: number }[];
}

export interface GoogleFontsCatalogSourceOptions {
  cloudEnabled: boolean;
  isDev: boolean;
  forceLocal: boolean;
  apiKey?: string;
}

export type GoogleFontsCatalogSource =
  | { kind: 'revyme'; url: '/api/media/fonts' }
  | { kind: 'field'; url: '/api/field/fonts' }
  | { kind: 'direct'; url: string }
  | { kind: 'fallback'; url: null };

/** Default system fonts — fallback when API is unavailable */
export const DEFAULT_FONTS: FontItem[] = [
  { family: 'Arial', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
  { family: 'Helvetica', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
  { family: 'Times New Roman', variants: ['regular', '700'], category: 'serif', tags: [] },
  { family: 'Georgia', variants: ['regular', '700'], category: 'serif', tags: [] },
  { family: 'Courier New', variants: ['regular', '700'], category: 'monospace', tags: [] },
  { family: 'Verdana', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
  { family: 'Tahoma', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
  { family: 'Trebuchet MS', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
  { family: 'Comic Sans MS', variants: ['regular', '700'], category: 'cursive', tags: [] },
  { family: 'Impact', variants: ['regular'], category: 'fantasy', tags: [] },
  { family: 'Roboto', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
  { family: 'Open Sans', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
  { family: 'Lato', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
  { family: 'Montserrat', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
  { family: 'Poppins', variants: ['regular', '700'], category: 'sans-serif', tags: [] },
];

/** Feeling categories extracted from Google Fonts tags */
export const FEELING_CATEGORIES = [
  'All',
  'Business',
  'Fancy',
  'Calm',
  'Playful',
  'Cute',
  'Artistic',
  'Vintage',
  'Loud',
  'Sophisticated',
  'Futuristic',
  'Active',
  'Stiff',
  'Innovative',
  'Happy',
  'Childlike',
  'Rugged',
  'Awkward',
  'Excited',
] as const;

/**
 * Match field's existing backend selection contract without importing the
 * backend layer into this shared module (which would create the wrong
 * dependency direction).
 *
 * Revyme Cloud explicitly enabled -> Revyme proxy.
 * Normal production field build     -> field Worker proxy.
 * Vite dev / forced-local preview   -> optional developer-owned direct key,
 *                                      otherwise DEFAULT_FONTS.
 */
export function resolveGoogleFontsCatalogSource(
  options: GoogleFontsCatalogSourceOptions,
): GoogleFontsCatalogSource {
  if (options.cloudEnabled) {
    return { kind: 'revyme', url: '/api/media/fonts' };
  }

  if (!options.isDev && !options.forceLocal) {
    return { kind: 'field', url: '/api/field/fonts' };
  }

  const apiKey = options.apiKey?.trim();
  if (apiKey) {
    const url = new URL('https://www.googleapis.com/webfonts/v1/webfonts');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('sort', 'popularity');
    url.searchParams.set('capability', 'FAMILY_TAGS');
    return { kind: 'direct', url: url.toString() };
  }

  return { kind: 'fallback', url: null };
}

export function mapGoogleFontsCatalog(data: unknown): FontItem[] {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { items?: unknown }).items)) {
    throw new Error('Google Fonts catalog response is malformed');
  }

  return ((data as { items: any[] }).items).map((item: any) => ({
    family: item.family,
    variants: item.variants || ['regular'],
    category: item.category || 'sans-serif',
    tags: item.tags || [],
  }));
}

/** Pure request seam used by tests and by the module-level cached fetcher. */
export async function fetchGoogleFontsFromSource(
  source: GoogleFontsCatalogSource,
  fetchImpl: typeof fetch = fetch,
): Promise<FontItem[]> {
  if (!source.url) return DEFAULT_FONTS;

  try {
    // `same-origin` includes Cloudflare Access credentials for field/Revyme
    // proxies, while it does not credential the cross-origin direct Google
    // request used only by a developer-owned local key.
    const response = await fetchImpl(source.url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Google Fonts API: ${response.status}`);
    return mapGoogleFontsCatalog(await response.json());
  } catch {
    return DEFAULT_FONTS;
  }
}

const CATALOG_SOURCE = resolveGoogleFontsCatalogSource({
  cloudEnabled: CLOUD_ENABLED,
  isDev: import.meta.env.DEV,
  forceLocal: import.meta.env.VITE_FIELD_LOCAL_BACKEND === 'true',
  apiKey: import.meta.env.VITE_GOOGLE_FONTS_KEY as string | undefined,
});

/** Module-level cache — only fetched once */
let cachedFonts: FontItem[] | null = null;
let fetchPromise: Promise<FontItem[]> | null = null;

/**
 * Fetch the Google Fonts catalog. Returns cached result on subsequent calls.
 * Falls back to DEFAULT_FONTS if API fails.
 */
export function fetchGoogleFonts(): Promise<FontItem[]> {
  if (cachedFonts) return Promise.resolve(cachedFonts);
  if (fetchPromise) return fetchPromise;

  if (!CATALOG_SOURCE.url) {
    trace.action('google-fonts:no-catalog-fallback', { count: DEFAULT_FONTS.length });
    cachedFonts = DEFAULT_FONTS;
    return Promise.resolve(DEFAULT_FONTS);
  }

  trace.action('google-fonts:fetch-start', { source: CATALOG_SOURCE.kind });

  fetchPromise = fetchGoogleFontsFromSource(CATALOG_SOURCE)
    .then(fonts => {
      cachedFonts = fonts;
      if (fonts === DEFAULT_FONTS) {
        trace.error('google-fonts:fetch-error', new Error('Google Fonts catalog unavailable'));
      } else {
        trace.action('google-fonts:fetch-done', { count: fonts.length, source: CATALOG_SOURCE.kind });
      }
      return fonts;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}
