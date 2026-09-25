import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleFieldPersistenceRequest, verifyAccessRequest } from './worker.js';

class MockR2 {
  objects = new Map<string, { body: string; etag: string }>();
  serial = 0;

  async get(key: string) {
    const row = this.objects.get(key);
    if (!row) return null;
    return { body: row.body, httpEtag: row.etag };
  }

  async put(key: string, body: string, options: { onlyIf?: Headers } = {}) {
    const current = this.objects.get(key);
    const ifMatch = options.onlyIf?.get('If-Match');
    const ifNoneMatch = options.onlyIf?.get('If-None-Match');
    if (ifMatch && current?.etag !== ifMatch) return null;
    if (ifNoneMatch === '*' && current) return null;
    const etag = `"r${++this.serial}"`;
    this.objects.set(key, { body: String(body), etag });
    return { httpEtag: etag };
  }
}

const allowAccess = async () => ({ ok: true });
const data = { format: 'revyme-v1', files: { 'app/page.client.tsx': 'hello' } };

function req(path: string, init: RequestInit = {}) {
  return new Request(`https://field.loew.fi${path}`, init);
}

test('persistence API fails closed when Access validation cannot be established', async () => {
  let assetCalls = 0;
  const res = await worker.fetch(req('/api/field/projects/local'), {
    FIELD_PROJECTS: new MockR2(),
    ASSETS: { fetch: async () => { assetCalls++; return new Response('asset'); } },
  });
  assert.equal(res.status, 403);
  assert.equal(assetCalls, 0);
});

test('conditional create/update round-trips JSON + ETag and rejects stale writes', async () => {
  const bucket = new MockR2();
  const env = { FIELD_PROJECTS: bucket };

  const create = await handleFieldPersistenceRequest(req('/api/field/projects/local', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-None-Match': '*' },
    body: JSON.stringify(data),
  }), env, allowAccess);
  assert.equal(create?.status, 200);
  const revA = create?.headers.get('ETag');
  assert.ok(revA);

  const duplicateCreate = await handleFieldPersistenceRequest(req('/api/field/projects/local', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-None-Match': '*' },
    body: JSON.stringify({ ...data, files: { bad: 'stale' } }),
  }), env, allowAccess);
  assert.equal(duplicateCreate?.status, 412);

  const get = await handleFieldPersistenceRequest(req('/api/field/projects/local'), env, allowAccess);
  assert.equal(get?.status, 200);
  assert.equal(get?.headers.get('ETag'), revA);
  assert.equal(get?.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await get?.json(), data);

  const update = await handleFieldPersistenceRequest(req('/api/field/projects/local', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': revA! },
    body: JSON.stringify({ ...data, files: { 'app/page.client.tsx': 'newer' } }),
  }), env, allowAccess);
  assert.equal(update?.status, 200);
  const revB = update?.headers.get('ETag');
  assert.notEqual(revB, revA);

  const stale = await handleFieldPersistenceRequest(req('/api/field/projects/local', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': revA! },
    body: JSON.stringify({ ...data, files: { bad: 'older' } }),
  }), env, allowAccess);
  assert.equal(stale?.status, 412);

  const finalGet = await handleFieldPersistenceRequest(req('/api/field/projects/local'), env, allowAccess);
  assert.equal((await finalGet?.json()).files['app/page.client.tsx'], 'newer');
});

test('project-name metadata persists independently', async () => {
  const env = { FIELD_PROJECTS: new MockR2() };
  const put = await handleFieldPersistenceRequest(req('/api/field/projects/local/meta', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-None-Match': '*' },
    body: JSON.stringify({ name: 'My field project' }),
  }), env, allowAccess);
  assert.equal(put?.status, 200);

  const get = await handleFieldPersistenceRequest(req('/api/field/projects/local/meta'), env, allowAccess);
  assert.equal(get?.status, 200);
  assert.equal((await get?.json()).name, 'My field project');
});

test('malformed routes/bodies and blind writes are rejected before SPA fallback', async () => {
  const env = { FIELD_PROJECTS: new MockR2() };
  assert.equal((await handleFieldPersistenceRequest(req('/api/field/projects'), env, allowAccess))?.status, 400);
  assert.equal((await handleFieldPersistenceRequest(req('/api/field/projects/bad$id'), env, allowAccess))?.status, 400);

  const malformed = await handleFieldPersistenceRequest(req('/api/field/projects/local', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-None-Match': '*' },
    body: JSON.stringify({ nope: true }),
  }), env, allowAccess);
  assert.equal(malformed?.status, 400);

  const blind = await handleFieldPersistenceRequest(req('/api/field/projects/local', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }), env, allowAccess);
  assert.equal(blind?.status, 428);
});

test('static main/canvas/preview routing and security headers remain intact', async () => {
  const assets = {
    calls: [] as string[],
    async fetch(request: Request) {
      this.calls.push(new URL(request.url).pathname);
      return new Response('ok', { status: 200 });
    },
  };
  const env = { FIELD_PROJECTS: new MockR2(), ASSETS: assets };

  let res = await worker.fetch(new Request('https://field.loew.fi/'), env);
  assert.equal(res.status, 200);
  assert.equal(assets.calls[assets.calls.length - 1], '/');

  res = await worker.fetch(new Request('https://canvas.field.loew.fi/'), env);
  assert.equal(assets.calls[assets.calls.length - 1], '/sandbox/index.html');
  assert.equal(res.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
  assert.equal(res.headers.get('Cross-Origin-Embedder-Policy'), 'credentialless');

  res = await worker.fetch(new Request('https://preview.field.loew.fi/'), env);
  assert.equal(assets.calls[assets.calls.length - 1], '/preview-sandbox/index.html');
  assert.equal(res.headers.get('Cross-Origin-Resource-Policy'), 'cross-origin');
});


test('Access verifier validates RS256 signature, issuer, audience, and expiry', async () => {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  publicJwk.kid = 'test-key';
  publicJwk.alg = 'RS256';
  const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = enc({ alg: 'RS256', kid: 'test-key', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = enc({ iss: 'https://unit-test.cloudflareaccess.com', aud: ['field-aud'], exp: now + 300, nbf: now - 1, sub: 'u1' });
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(signingInput));
  const token = `${signingInput}.${Buffer.from(signature).toString('base64url')}`;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [publicJwk] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  try {
    const verified = await verifyAccessRequest(new Request('https://field.loew.fi/', {
      headers: { 'Cf-Access-Jwt-Assertion': token },
    }), {
      FIELD_ACCESS_TEAM_DOMAIN: 'https://unit-test.cloudflareaccess.com',
      FIELD_ACCESS_AUD: 'field-aud',
    });
    assert.equal(verified.ok, true);

    const wrongAudience = await verifyAccessRequest(new Request('https://field.loew.fi/', {
      headers: { 'Cf-Access-Jwt-Assertion': token },
    }), {
      FIELD_ACCESS_TEAM_DOMAIN: 'https://unit-test.cloudflareaccess.com',
      FIELD_ACCESS_AUD: 'wrong-aud',
    });
    assert.equal(wrongAudience.ok, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
