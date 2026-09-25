import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleFieldDashboardRequest, handleFieldPersistenceRequest } from './worker.js';

type Stored = { body: string; etag: string; uploaded: Date };

class MockR2 {
  objects = new Map<string, Stored>();
  serial = 0;

  async get(key: string) {
    const row = this.objects.get(key);
    if (!row) return null;
    return {
      body: row.body,
      httpEtag: row.etag,
      uploaded: row.uploaded,
      text: async () => row.body,
      arrayBuffer: async () => new TextEncoder().encode(row.body).buffer,
    };
  }

  async put(key: string, body: string | ArrayBuffer | ArrayBufferView, options: { onlyIf?: Headers } = {}) {
    const current = this.objects.get(key);
    const ifMatch = options.onlyIf?.get('If-Match');
    const ifNoneMatch = options.onlyIf?.get('If-None-Match');
    if (ifMatch && current?.etag !== ifMatch) return null;
    if (ifNoneMatch === '*' && current) return null;

    let text: string;
    if (typeof body === 'string') text = body;
    else if (body instanceof ArrayBuffer) text = new TextDecoder().decode(body);
    else text = new TextDecoder().decode(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));

    const etag = `"r${++this.serial}"`;
    this.objects.set(key, { body: text, etag, uploaded: new Date(`2026-09-25T0${Math.min(this.serial, 9)}:00:00.000Z`) });
    return { httpEtag: etag };
  }

  async delete(keys: string | string[]) {
    for (const key of Array.isArray(keys) ? keys : [keys]) this.objects.delete(key);
  }

  async list({ prefix = '' }: { prefix?: string } = {}) {
    const objects = [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, row]) => ({ key, uploaded: row.uploaded }));
    return { objects, truncated: false, cursor: undefined };
  }
}

const allowAccess = async () => ({ ok: true });
const project = { format: 'revyme-v1', files: { 'app/page.client.tsx': '<main />' } };

function req(path: string, init: RequestInit = {}) {
  return new Request(`https://field.loew.fi${path}`, init);
}

async function seed(bucket: MockR2, id: string, meta?: Record<string, unknown>, data: unknown = project) {
  if (data !== null) await bucket.put(`projects/${id}/current.json`, JSON.stringify(data));
  if (meta) await bucket.put(`projects/${id}/meta.json`, JSON.stringify(meta));
}

test('project collection is Access-protected and never falls through to SPA assets', async () => {
  let assetCalls = 0;
  const response = await worker.fetch(req('/api/field/projects'), {
    FIELD_PROJECTS: new MockR2(),
    ASSETS: { fetch: async () => { assetCalls++; return new Response('asset'); } },
  });
  assert.equal(response.status, 403);
  assert.equal(assetCalls, 0);
});

test('list normalizes current-only, meta-only, legacy, and complete projects without returning project files', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'current-only');
  await seed(bucket, 'meta-only', { name: 'Meta only', updatedAt: '2026-09-24T12:00:00Z' }, null);
  await seed(bucket, 'legacy', { name: 'Legacy', updatedAt: '2026-09-24T13:00:00Z' });
  await seed(bucket, 'complete', {
    id: 'wrong-id-is-ignored',
    name: 'Complete',
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-25T00:00:00Z',
    starred: true,
    trashedAt: null,
    thumbnail: null,
  });

  const response = await handleFieldDashboardRequest(req('/api/field/projects'), { FIELD_PROJECTS: bucket }, allowAccess);
  assert.equal(response?.status, 200);
  const body = await response?.json();
  assert.equal(body.projects.length, 4);
  assert.equal(JSON.stringify(body).includes('app/page.client.tsx'), false);

  const currentOnly = body.projects.find((row: { id: string }) => row.id === 'current-only');
  assert.equal(currentOnly.name, 'Untitled');
  assert.equal(currentOnly.starred, false);
  assert.equal(currentOnly.trashedAt, null);

  const legacy = body.projects.find((row: { id: string }) => row.id === 'legacy');
  assert.equal(typeof legacy.createdAt, 'string');
  assert.equal(legacy.thumbnail, null);

  const complete = body.projects.find((row: { id: string }) => row.id === 'complete');
  assert.equal(complete.id, 'complete');
  assert.equal(complete.starred, true);
});

test('create generates durable metadata without inventing current.json', async () => {
  const bucket = new MockR2();
  const response = await handleFieldDashboardRequest(req('/api/field/projects', { method: 'POST' }), { FIELD_PROJECTS: bucket }, allowAccess);
  assert.equal(response?.status, 201);
  const body = await response?.json();
  assert.match(body.project.id, /^[A-Za-z0-9][A-Za-z0-9._-]+$/);
  assert.equal(body.project.name, 'Untitled');
  assert.ok(await bucket.get(`projects/${body.project.id}/meta.json`));
  assert.equal(await bucket.get(`projects/${body.project.id}/current.json`), null);
});

test('metadata patch merges supported fields and preserves unknown/future metadata', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'local', {
    name: 'Local',
    updatedAt: '2026-09-24T00:00:00Z',
    starred: false,
    futureField: { keep: true },
  });
  const before = await bucket.get('projects/local/meta.json');

  const response = await handleFieldPersistenceRequest(req('/api/field/projects/local/meta', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': before!.httpEtag },
    body: JSON.stringify({ starred: true, trashedAt: '2026-09-25T06:00:00Z' }),
  }), { FIELD_PROJECTS: bucket }, allowAccess);

  assert.equal(response?.status, 200);
  const body = await response?.json();
  assert.equal(body.project.starred, true);
  assert.equal(body.project.trashedAt, '2026-09-25T06:00:00.000Z');
  const stored = JSON.parse((await bucket.get('projects/local/meta.json'))!.body as string);
  assert.deepEqual(stored.futureField, { keep: true });
  assert.equal(stored.name, 'Local');
});

test('saving current.json advances dashboard updatedAt without erasing metadata', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'local', {
    name: 'Local',
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-21T00:00:00Z',
    starred: true,
    trashedAt: null,
  });
  const current = await bucket.get('projects/local/current.json');
  const response = await handleFieldPersistenceRequest(req('/api/field/projects/local', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': current!.httpEtag },
    body: JSON.stringify({ ...project, files: { 'app/page.client.tsx': '<main>new</main>' } }),
  }), { FIELD_PROJECTS: bucket }, allowAccess);
  assert.equal(response?.status, 200);
  const stored = JSON.parse((await bucket.get('projects/local/meta.json'))!.body as string);
  assert.equal(stored.name, 'Local');
  assert.equal(stored.starred, true);
  assert.notEqual(stored.updatedAt, '2026-09-21T00:00:00Z');
});

test('duplicate copies project bytes independently and resets dashboard state', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'source', {
    name: 'Source',
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-24T00:00:00Z',
    starred: true,
    trashedAt: '2026-09-24T01:00:00Z',
  });

  const response = await handleFieldDashboardRequest(req('/api/field/projects/source/duplicate', { method: 'POST' }), { FIELD_PROJECTS: bucket }, allowAccess);
  assert.equal(response?.status, 201);
  const body = await response?.json();
  assert.notEqual(body.project.id, 'source');
  assert.equal(body.project.name, 'Source Copy');
  assert.equal(body.project.starred, false);
  assert.equal(body.project.trashedAt, null);

  const sourceCurrent = (await bucket.get('projects/source/current.json'))!.body;
  const copyCurrent = (await bucket.get(`projects/${body.project.id}/current.json`))!.body;
  assert.equal(copyCurrent, sourceCurrent);

  await bucket.put(`projects/${body.project.id}/current.json`, JSON.stringify({ ...project, files: { changed: 'copy only' } }));
  assert.equal((await bucket.get('projects/source/current.json'))!.body, sourceCurrent);
});

test('permanent delete is Trash-only and deletes only project-owned keys', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'keep', { name: 'Keep', updatedAt: '2026-09-25T00:00:00Z', trashedAt: null });
  await seed(bucket, 'trash', { name: 'Trash', updatedAt: '2026-09-25T00:00:00Z', trashedAt: '2026-09-25T01:00:00Z' });
  await bucket.put('projects/trash/thumbnail.webp', 'thumb');
  await bucket.put('profiles/someone/profile.json', '{}');

  const blocked = await handleFieldDashboardRequest(req('/api/field/projects/keep', { method: 'DELETE' }), { FIELD_PROJECTS: bucket }, allowAccess);
  assert.equal(blocked?.status, 409);

  const deleted = await handleFieldDashboardRequest(req('/api/field/projects/trash', { method: 'DELETE' }), { FIELD_PROJECTS: bucket }, allowAccess);
  assert.equal(deleted?.status, 204);
  assert.equal(await bucket.get('projects/trash/current.json'), null);
  assert.equal(await bucket.get('projects/trash/meta.json'), null);
  assert.equal(await bucket.get('projects/trash/thumbnail.webp'), null);
  assert.ok(await bucket.get('projects/keep/current.json'));
  assert.ok(await bucket.get('profiles/someone/profile.json'));
});

test('malformed dashboard ids are rejected before assets', async () => {
  let assetCalls = 0;
  const response = await worker.fetch(req('/api/field/projects/bad$id/duplicate', { method: 'POST' }), {
    FIELD_PROJECTS: new MockR2(),
    ASSETS: { fetch: async () => { assetCalls++; return new Response('asset'); } },
  }, {
    access: { getIdentity: async () => ({ user_uuid: 'u1' }) },
  });
  assert.equal(response.status, 400);
  assert.equal(assetCalls, 0);
});
