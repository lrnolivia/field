import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleGoogleFontsRequest } from './worker.js';

const allowAccess = async () => ({ ok: true });
const secret = 'server-only-google-key';

function req(path = '/api/field/fonts', init: RequestInit = {}) {
  return new Request(`https://field.loew.fi${path}`, init);
}

class MockCache {
  rows = new Map<string, Response>();

  async match(request: Request) {
    const hit = this.rows.get(request.url);
    return hit?.clone();
  }

  async put(request: Request, response: Response) {
    this.rows.set(request.url, response.clone());
  }
}

test('font API is routed before static fallback and fails closed without Access', async () => {
  let assetCalls = 0;
  const res = await worker.fetch(req(), {
    GOOGLE_FONTS_API_KEY: secret,
    ASSETS: { fetch: async () => { assetCalls++; return new Response('asset'); } },
  });
  assert.equal(res.status, 403);
  assert.equal(assetCalls, 0);
  assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
});

test('font API only accepts GET', async () => {
  const res = await handleGoogleFontsRequest(req('/api/field/fonts', { method: 'POST' }), {
    GOOGLE_FONTS_API_KEY: secret,
  }, allowAccess, { cache: null });
  assert.equal(res?.status, 405);
  assert.equal(res?.headers.get('Allow'), 'GET');
});

test('missing Worker secret returns a controlled 503', async () => {
  const res = await handleGoogleFontsRequest(req(), {}, allowAccess, { cache: null });
  assert.equal(res?.status, 503);
  assert.deepEqual(await res?.json(), { error: 'Google Fonts catalog is not configured' });
});

test('upstream request is fixed to Google, popularity sorted, and asks for FAMILY_TAGS', async () => {
  let captured: URL | null = null;
  const fetchImpl = async (input: RequestInfo | URL) => {
    captured = new URL(String(input));
    return Response.json({ items: [{ family: 'Roboto', variants: ['regular'], category: 'sans-serif', tags: [] }] });
  };

  const res = await handleGoogleFontsRequest(req(), {
    GOOGLE_FONTS_API_KEY: secret,
  }, allowAccess, { cache: null, fetchImpl });

  assert.equal(res?.status, 200);
  assert.ok(captured);
  assert.equal(captured!.origin + captured!.pathname, 'https://www.googleapis.com/webfonts/v1/webfonts');
  assert.equal(captured!.searchParams.get('key'), secret);
  assert.equal(captured!.searchParams.get('sort'), 'popularity');
  assert.equal(captured!.searchParams.get('capability'), 'FAMILY_TAGS');
  assert.equal((await res!.text()).includes(secret), false);
});

test('successful catalog responses are cached for 24 hours under a secret-free key', async () => {
  const cache = new MockCache();
  let upstreamCalls = 0;
  const fetchImpl = async () => {
    upstreamCalls++;
    return Response.json({ items: [{ family: 'Roboto', variants: ['regular'], category: 'sans-serif', tags: [] }] });
  };

  const runtime = { cache, fetchImpl };
  const env = { GOOGLE_FONTS_API_KEY: secret };
  const first = await handleGoogleFontsRequest(req(), env, allowAccess, runtime);
  const second = await handleGoogleFontsRequest(req(), env, allowAccess, runtime);

  assert.equal(first?.status, 200);
  assert.equal(second?.status, 200);
  assert.equal(upstreamCalls, 1);
  assert.equal(first?.headers.get('Cache-Control'), 'public, max-age=0, s-maxage=86400');
  assert.equal([...cache.rows.keys()].some((key) => key.includes(secret)), false);
});

test('upstream non-2xx and malformed payloads fail as JSON instead of SPA HTML', async () => {
  const nonOk = await handleGoogleFontsRequest(req(), {
    GOOGLE_FONTS_API_KEY: secret,
  }, allowAccess, {
    cache: null,
    fetchImpl: async () => new Response('bad', { status: 500 }),
  });
  assert.equal(nonOk?.status, 502);
  assert.deepEqual(await nonOk?.json(), { error: 'Google Fonts catalog unavailable' });

  const malformed = await handleGoogleFontsRequest(req(), {
    GOOGLE_FONTS_API_KEY: secret,
  }, allowAccess, {
    cache: null,
    fetchImpl: async () => Response.json({ nope: true }),
  });
  assert.equal(malformed?.status, 502);
  assert.deepEqual(await malformed?.json(), { error: 'Google Fonts catalog unavailable' });
});
