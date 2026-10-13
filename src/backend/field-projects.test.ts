import { describe, expect, it, vi } from 'vitest';
import {
  createFieldProject,
  duplicateFieldProject,
  listFieldProjects,
  permanentlyDeleteFieldProject,
  renameFieldProject,
  restoreFieldProject,
  setFieldProjectStarred,
} from './field-projects';

const meta = {
  id: 'abc123',
  name: 'loew.fi',
  createdAt: '2026-09-25T01:00:00.000Z',
  updatedAt: '2026-09-25T02:00:00.000Z',
  starred: false,
  trashedAt: null,
  thumbnail: null,
};

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('field dashboard project API client', () => {
  it('lists metadata only', async () => {
    const fetchImpl = vi.fn(async () => json({ projects: [meta] })) as unknown as typeof fetch;
    await expect(listFieldProjects(fetchImpl)).resolves.toEqual([meta]);
    expect(fetchImpl).toHaveBeenCalledWith('/api/field/projects', expect.objectContaining({ method: 'GET' }));
  });

  it('creates and duplicates projects through collection/action routes', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return json({ project: url.endsWith('/duplicate') ? { ...meta, id: 'copy', name: 'loew.fi Copy' } : meta }, { status: 201 });
    }) as unknown as typeof fetch;

    await expect(createFieldProject(fetchImpl)).resolves.toEqual(meta);
    await expect(duplicateFieldProject('abc123', fetchImpl)).resolves.toMatchObject({ id: 'copy' });
  });

  it('uses ETag-conditioned metadata updates', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') return json({ name: 'old' }, { headers: { ETag: '"m1"' } });
      const headers = new Headers(init?.headers);
      expect(headers.get('If-Match')).toBe('"m1"');
      return json({ project: { ...meta, name: 'New name' } }, { headers: { ETag: '"m2"' } });
    }) as unknown as typeof fetch;

    await expect(renameFieldProject('abc123', 'New name', fetchImpl)).resolves.toMatchObject({ name: 'New name' });
  });

  it('normalizes Cloudflare-weakened metadata ETags before conditional updates', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') {
        return json(
          { name: 'old' },
          { headers: { ETag: 'W/"m1"' } },
        );
      }

      const headers = new Headers(init?.headers);
      expect(headers.get('If-Match')).toBe('"m1"');

      return json(
        { project: { ...meta, name: 'New name' } },
        { headers: { ETag: 'W/"m2"' } },
      );
    }) as unknown as typeof fetch;

    await expect(
      renameFieldProject('abc123', 'New name', fetchImpl),
    ).resolves.toMatchObject({ name: 'New name' });
  });

  it('retries one metadata conflict against the latest revision', async () => {
    let getCount = 0;
    let putCount = 0;
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') {
        getCount++;
        return json({}, { headers: { ETag: getCount === 1 ? '"m1"' : '"m2"' } });
      }
      putCount++;
      if (putCount === 1) return json({ error: 'Persistence conflict' }, { status: 412 });
      return json({ project: { ...meta, starred: true } }, { headers: { ETag: '"m3"' } });
    }) as unknown as typeof fetch;

    await expect(setFieldProjectStarred('abc123', true, fetchImpl)).resolves.toMatchObject({ starred: true });
    expect(getCount).toBe(2);
    expect(putCount).toBe(2);
  });

  it('normalizes the refreshed ETag when retrying a metadata conflict', async () => {
    let getCount = 0;
    let putCount = 0;

    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') {
        getCount++;
        return json(
          {},
          {
            headers: {
              ETag: getCount === 1 ? 'W/"m1"' : 'W/"m2"',
            },
          },
        );
      }

      putCount++;
      const headers = new Headers(init?.headers);

      if (putCount === 1) {
        expect(headers.get('If-Match')).toBe('"m1"');
        return json(
          { error: 'Persistence conflict' },
          { status: 412 },
        );
      }

      expect(headers.get('If-Match')).toBe('"m2"');

      return json(
        { project: { ...meta, starred: true } },
        { headers: { ETag: 'W/"m3"' } },
      );
    }) as unknown as typeof fetch;

    await expect(
      setFieldProjectStarred('abc123', true, fetchImpl),
    ).resolves.toMatchObject({ starred: true });

    expect(getCount).toBe(2);
    expect(putCount).toBe(2);
  });

  it('restores with trashedAt null and permanently deletes only through DELETE', async () => {
    const calls: Array<{ method: string; body?: string | null }> = [];
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ method, body: typeof init?.body === 'string' ? init.body : null });
      if (method === 'GET') return json({}, { headers: { ETag: '"m1"' } });
      if (method === 'PUT') return json({ project: meta }, { headers: { ETag: '"m2"' } });
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    await restoreFieldProject('abc123', fetchImpl);
    expect(calls.some((call) => call.method === 'PUT' && call.body?.includes('"trashedAt":null'))).toBe(true);
    await expect(permanentlyDeleteFieldProject('abc123', fetchImpl)).resolves.toBeUndefined();
    expect(calls[calls.length - 1]?.method).toBe('DELETE');
  });
});
