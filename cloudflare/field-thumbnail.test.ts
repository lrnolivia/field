import test from 'node:test';
import assert from 'node:assert/strict';
import { handleFieldDashboardRequest, handleFieldPersistenceRequest } from './worker.js';

type Stored = {
  bytes: Uint8Array;
  etag: string;
  uploaded: Date;
  httpMetadata?: { contentType?: string };
};

class MockR2 {
  objects = new Map<string, Stored>();
  serial = 0;

  async get(key: string) {
    const row = this.objects.get(key);
    if (!row) return null;
    return {
      body: row.bytes,
      httpEtag: row.etag,
      uploaded: row.uploaded,
      httpMetadata: row.httpMetadata,
      text: async () => new TextDecoder().decode(row.bytes),
      arrayBuffer: async () => row.bytes.buffer.slice(
        row.bytes.byteOffset,
        row.bytes.byteOffset + row.bytes.byteLength,
      ),
    };
  }

  async put(
    key: string,
    body: string | ArrayBuffer | ArrayBufferView,
    options: { onlyIf?: Headers; httpMetadata?: { contentType?: string } } = {},
  ) {
    const current = this.objects.get(key);
    const ifMatch = options.onlyIf?.get('If-Match');
    const ifNoneMatch = options.onlyIf?.get('If-None-Match');
    if (ifMatch && current?.etag !== ifMatch) return null;
    if (ifNoneMatch === '*' && current) return null;

    let bytes: Uint8Array;
    if (typeof body === 'string') bytes = new TextEncoder().encode(body);
    else if (body instanceof ArrayBuffer) bytes = new Uint8Array(body.slice(0));
    else bytes = new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));

    const etag = `"r${++this.serial}"`;
    const uploaded = new Date(`2026-09-25T${String(this.serial).padStart(2, '0')}:00:00.000Z`);
    const row = { bytes, etag, uploaded, httpMetadata: options.httpMetadata };
    this.objects.set(key, row);
    return { httpEtag: etag, uploaded, httpMetadata: options.httpMetadata };
  }

  async delete(keys: string | string[]) {
    for (const key of Array.isArray(keys) ? keys : [keys]) this.objects.delete(key);
  }

  async list({ prefix = '' }: { prefix?: string } = {}) {
    return {
      objects: [...this.objects.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, row]) => ({ key, uploaded: row.uploaded })),
      truncated: false,
      cursor: undefined,
    };
  }
}

const allowAccess = async () => ({ ok: true });
const project = { format: 'revyme-v1', files: { 'app/page.client.tsx': '<main />' } };

function req(path: string, init: RequestInit = {}) {
  return new Request(`https://field.loew.fi${path}`, init);
}

async function seed(bucket: MockR2, id: string) {
  await bucket.put(`projects/${id}/current.json`, JSON.stringify(project), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  await bucket.put(`projects/${id}/meta.json`, JSON.stringify({
    id,
    name: 'Thumbnail test',
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T01:00:00.000Z',
    starred: false,
    trashedAt: null,
    thumbnail: null,
  }), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
}

test('thumbnail HEAD reports missing cache without changing project time', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'site');
  const response = await handleFieldDashboardRequest(
    req('/api/field/projects/site/thumbnail', { method: 'HEAD' }),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  assert.equal(response?.status, 404);
  assert.equal(response?.headers.get('X-Field-Project-Updated-At'), '2026-09-25T01:00:00.000Z');
});

test('thumbnail PUT stores raw image bytes and GET/HEAD expose version clocks', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'site');
  const image = new TextEncoder().encode('jpeg-bytes');

  const put = await handleFieldDashboardRequest(
    req('/api/field/projects/site/thumbnail', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: image,
    }),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  assert.equal(put?.status, 200);
  const result = await put?.json();
  assert.match(result.url, /^\/api\/field\/projects\/site\/thumbnail\?v=/);

  const stored = await bucket.get('projects/site/thumbnail');
  assert.ok(stored);
  assert.equal(stored.httpMetadata?.contentType, 'image/jpeg');
  assert.equal(new TextDecoder().decode(new Uint8Array(await stored.arrayBuffer())), 'jpeg-bytes');

  const head = await handleFieldDashboardRequest(
    req(result.url, { method: 'HEAD' }),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  assert.equal(head?.status, 200);
  assert.equal(head?.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(head?.headers.get('Cache-Control'), 'private, max-age=31536000, immutable');
  assert.ok(head?.headers.get('X-Field-Thumbnail-Updated-At'));

  const get = await handleFieldDashboardRequest(
    req(result.url),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  assert.equal(get?.status, 200);
  assert.equal(await get?.text(), 'jpeg-bytes');
});

test('thumbnail writes never advance Recents, while later project saves make the cache stale', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'site');
  const metaBefore = JSON.parse(await (await bucket.get('projects/site/meta.json'))!.text());

  await handleFieldDashboardRequest(
    req('/api/field/projects/site/thumbnail', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: new Uint8Array([1, 2, 3]),
    }),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  const metaAfterThumbnail = JSON.parse(await (await bucket.get('projects/site/meta.json'))!.text());
  assert.equal(metaAfterThumbnail.updatedAt, metaBefore.updatedAt);

  const current = await bucket.get('projects/site/current.json');
  const save = await handleFieldPersistenceRequest(
    req('/api/field/projects/site', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'If-Match': current!.httpEtag,
      },
      body: JSON.stringify({ ...project, files: { 'app/page.client.tsx': '<main>new</main>' } }),
    }),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  assert.equal(save?.status, 200);

  const head = await handleFieldDashboardRequest(
    req('/api/field/projects/site/thumbnail', { method: 'HEAD' }),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  assert.equal(head?.status, 200);
  assert.ok(Date.parse(head!.headers.get('X-Field-Project-Updated-At')!) > Date.parse(head!.headers.get('X-Field-Thumbnail-Updated-At')!));
});

test('project list derives a versioned image URL from R2 without loading project snapshots', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'site');
  await bucket.put('projects/site/thumbnail', new Uint8Array([1]), {
    httpMetadata: { contentType: 'image/jpeg' },
  });

  const response = await handleFieldDashboardRequest(
    req('/api/field/projects'),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  const body = await response?.json();
  assert.equal(body.projects.length, 1);
  assert.match(body.projects[0].thumbnail, /^\/api\/field\/projects\/site\/thumbnail\?v=/);
  assert.equal(body.projects[0].updatedAt, '2026-09-25T01:00:00.000Z');
});

test('duplicate copies the cached thumbnail to its own project URL', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'site');
  await bucket.put('projects/site/thumbnail', new Uint8Array([9, 8, 7]), {
    httpMetadata: { contentType: 'image/jpeg' },
  });

  const response = await handleFieldDashboardRequest(
    req('/api/field/projects/site/duplicate', { method: 'POST' }),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  assert.equal(response?.status, 201);
  const body = await response?.json();
  assert.ok(body.project.id !== 'site');
  assert.match(body.project.thumbnail, new RegExp(`/api/field/projects/${body.project.id}/thumbnail\\?v=`));
  assert.ok(await bucket.get(`projects/${body.project.id}/thumbnail`));
});

test('thumbnail upload rejects unsupported media and permanent delete removes canonical and legacy caches', async () => {
  const bucket = new MockR2();
  await seed(bucket, 'site');
  const bad = await handleFieldDashboardRequest(
    req('/api/field/projects/site/thumbnail', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/gif' },
      body: new Uint8Array([1]),
    }),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  assert.equal(bad?.status, 415);

  await bucket.put('projects/site/thumbnail', new Uint8Array([1]));
  await bucket.put('projects/site/thumbnail.webp', new Uint8Array([2]));
  const meta = await bucket.get('projects/site/meta.json');
  const parsed = JSON.parse(await meta!.text());
  parsed.trashedAt = '2026-09-25T08:00:00.000Z';
  await bucket.put('projects/site/meta.json', JSON.stringify(parsed));

  const deleted = await handleFieldDashboardRequest(
    req('/api/field/projects/site', { method: 'DELETE' }),
    { FIELD_PROJECTS: bucket },
    allowAccess,
  );
  assert.equal(deleted?.status, 204);
  assert.equal(await bucket.get('projects/site/thumbnail'), null);
  assert.equal(await bucket.get('projects/site/thumbnail.webp'), null);
});
