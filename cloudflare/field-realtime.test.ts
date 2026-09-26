import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleFieldDashboardRequest,
  handleFieldPersistenceRequest,
  handleFieldRealtimeRequest,
} from './worker.js';

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
    const uploaded = new Date(`2026-09-26T${String(Math.min(this.serial, 23)).padStart(2, '0')}:00:00.000Z`);
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

type EventRow = Record<string, unknown>;

class MockRealtimeNamespace {
  rooms = new Map<string, { events: EventRow[]; connects: number }>();

  idFromName(name: string) {
    return { name };
  }

  get(id: { name: string }) {
    let room = this.rooms.get(id.name);
    if (!room) {
      room = { events: [], connects: 0 };
      this.rooms.set(id.name, room);
    }
    return {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init);
        const pathname = new URL(request.url).pathname;
        if (pathname === '/api/field/realtime') {
          room!.connects += 1;
          return new Response('connected');
        }
        if (pathname === '/broadcast') {
          room!.events.push(await request.json() as EventRow);
          return new Response(null, { status: 204 });
        }
        return new Response(null, { status: 404 });
      },
    };
  }
}

const project = { format: 'revyme-v1', files: { 'app/page.client.tsx': '<main />' } };
const allowUser = (sub = 'user-1') => async () => ({ ok: true, payload: { sub } });
const denyAccess = async () => ({ ok: false, reason: 'nope' });

function req(path: string, init: RequestInit = {}) {
  return new Request(`https://field.loew.fi${path}`, init);
}

async function seed(bucket: MockR2, id: string, trashedAt: string | null = null) {
  await bucket.put(`projects/${id}/current.json`, JSON.stringify(project), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  await bucket.put(`projects/${id}/meta.json`, JSON.stringify({
    id,
    name: 'Realtime test',
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T01:00:00.000Z',
    starred: false,
    trashedAt,
    thumbnail: null,
  }), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
}

test('realtime connection is Access-protected', async () => {
  const realtime = new MockRealtimeNamespace();
  const response = await handleFieldRealtimeRequest(
    req('/api/field/realtime', { headers: { Upgrade: 'websocket' } }),
    { FIELD_PROJECT_EVENTS: realtime },
    denyAccess,
  );
  assert.equal(response?.status, 403);
  assert.equal(realtime.rooms.size, 0);
});

test('authenticated users are routed to isolated Durable Object rooms', async () => {
  const realtime = new MockRealtimeNamespace();
  const request = req('/api/field/realtime', { headers: { Upgrade: 'websocket' } });
  await handleFieldRealtimeRequest(request, { FIELD_PROJECT_EVENTS: realtime }, allowUser('user-a'));
  await handleFieldRealtimeRequest(request, { FIELD_PROJECT_EVENTS: realtime }, allowUser('user-b'));
  await handleFieldRealtimeRequest(request, { FIELD_PROJECT_EVENTS: realtime }, allowUser('user-a'));
  assert.equal(realtime.rooms.get('user-a')?.connects, 2);
  assert.equal(realtime.rooms.get('user-b')?.connects, 1);
  assert.equal(realtime.rooms.size, 2);
});

test('successful document PUT broadcasts one document event with persisted revision; 412 does not', async () => {
  const bucket = new MockR2();
  const realtime = new MockRealtimeNamespace();
  await seed(bucket, 'local');
  const current = await bucket.get('projects/local/current.json');
  const env = { FIELD_PROJECTS: bucket, FIELD_PROJECT_EVENTS: realtime };

  const ok = await handleFieldPersistenceRequest(req('/api/field/projects/local', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': current!.httpEtag,
      'X-Field-Session-Id': 'session-a',
    },
    body: JSON.stringify({ ...project, files: { 'app/page.client.tsx': '<main>new</main>' } }),
  }), env, allowUser());
  assert.equal(ok?.status, 200);
  const revision = ok?.headers.get('ETag');
  const events = realtime.rooms.get('user-1')!.events;
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'project-change');
  assert.equal(events[0].projectId, 'local');
  assert.equal(events[0].kind, 'document');
  assert.equal(events[0].revision, revision);
  assert.equal(events[0].sourceSessionId, 'session-a');
  assert.ok(Number.isFinite(Date.parse(String(events[0].changedAt))));

  const stale = await handleFieldPersistenceRequest(req('/api/field/projects/local', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': current!.httpEtag },
    body: JSON.stringify(project),
  }), env, allowUser());
  assert.equal(stale?.status, 412);
  assert.equal(events.length, 1);
});

test('metadata, thumbnail, and delete successes broadcast their semantic event kinds', async () => {
  const bucket = new MockR2();
  const realtime = new MockRealtimeNamespace();
  await seed(bucket, 'site');
  const env = { FIELD_PROJECTS: bucket, FIELD_PROJECT_EVENTS: realtime };

  const meta = await bucket.get('projects/site/meta.json');
  const metadata = await handleFieldPersistenceRequest(req('/api/field/projects/site/meta', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': meta!.httpEtag },
    body: JSON.stringify({ starred: true }),
  }), env, allowUser());
  assert.equal(metadata?.status, 200);

  const thumbnail = await handleFieldDashboardRequest(req('/api/field/projects/site/thumbnail', {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: new Uint8Array([1, 2, 3]),
  }), env, allowUser());
  assert.equal(thumbnail?.status, 200);

  const metaAfter = await bucket.get('projects/site/meta.json');
  const parsedMeta = JSON.parse(await metaAfter!.text());
  parsedMeta.trashedAt = '2026-09-26T04:00:00.000Z';
  await bucket.put('projects/site/meta.json', JSON.stringify(parsedMeta));
  const deleted = await handleFieldDashboardRequest(
    req('/api/field/projects/site', { method: 'DELETE' }),
    env,
    allowUser(),
  );
  assert.equal(deleted?.status, 204);

  assert.deepEqual(
    realtime.rooms.get('user-1')!.events.map((row) => row.kind),
    ['metadata', 'thumbnail', 'deleted'],
  );
});

test('create and duplicate broadcast created for the new project only', async () => {
  const bucket = new MockR2();
  const realtime = new MockRealtimeNamespace();
  const env = { FIELD_PROJECTS: bucket, FIELD_PROJECT_EVENTS: realtime };

  const created = await handleFieldDashboardRequest(
    req('/api/field/projects', { method: 'POST' }),
    env,
    allowUser(),
  );
  assert.equal(created?.status, 201);
  const createdBody = await created?.json();

  await seed(bucket, 'source');
  const duplicate = await handleFieldDashboardRequest(
    req('/api/field/projects/source/duplicate', { method: 'POST' }),
    env,
    allowUser(),
  );
  assert.equal(duplicate?.status, 201);
  const duplicateBody = await duplicate?.json();

  const events = realtime.rooms.get('user-1')!.events;
  assert.deepEqual(events.map((row) => row.kind), ['created', 'created']);
  assert.equal(events[0].projectId, createdBody.project.id);
  assert.equal(events[1].projectId, duplicateBody.project.id);
});
