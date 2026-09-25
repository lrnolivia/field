import { afterEach, describe, expect, it, vi } from 'vitest';
import { FieldBackend, PersistenceConflictError } from './field-backend';
import { resolveBackendKind } from './index';
import type { ProjectData } from './types';
import { isRetryableSaveError } from './autosave';

const project: ProjectData = {
  format: 'revyme-v1',
  files: { 'app/page.client.tsx': 'hello' },
};

function response(body: unknown, status: number, etag?: string): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (etag) headers.set('ETag', etag);
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

afterEach(() => vi.restoreAllMocks());

describe('backend selection', () => {
  it('keeps explicitly-enabled Revyme Cloud authoritative', () => {
    expect(resolveBackendKind({ cloudEnabled: true, isDev: true, forceLocal: true })).toBe('revyme');
  });

  it('uses LocalBackend in ordinary development', () => {
    expect(resolveBackendKind({ cloudEnabled: false, isDev: true, forceLocal: false })).toBe('local');
  });

  it('uses FieldBackend for a normal production field build', () => {
    expect(resolveBackendKind({ cloudEnabled: false, isDev: false, forceLocal: false })).toBe('field');
  });

  it('supports an explicit local production-preview fallback', () => {
    expect(resolveBackendKind({ cloudEnabled: false, isDev: false, forceLocal: true })).toBe('local');
  });
});

describe('FieldBackend project persistence', () => {
  it('loads remote ProjectData, captures its ETag, and uses it on the next save', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(project, 200, '"rev-a"'))
      .mockResolvedValueOnce(response({ ok: true }, 200, '"rev-b"'));
    const backend = new FieldBackend({ fetchImpl: fetchImpl as typeof fetch });

    expect(await backend.loadProject('local')).toEqual(project);
    await backend.saveProject('local', project);

    const saveInit = fetchImpl.mock.calls[1][1] as RequestInit;
    expect(new Headers(saveInit.headers).get('If-Match')).toBe('"rev-a"');
    expect(new Headers(saveInit.headers).get('If-None-Match')).toBeNull();
  });

  it('uses conditional-create semantics for a first remote save', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ error: 'not found' }, 404))
      .mockResolvedValueOnce(response({ ok: true }, 200, '"rev-a"'));
    const backend = new FieldBackend({
      fetchImpl: fetchImpl as typeof fetch,
      legacyLoader: async () => null,
    });

    expect(await backend.loadProject('new-project')).toBeNull();
    await backend.saveProject('new-project', project);
    const saveInit = fetchImpl.mock.calls[1][1] as RequestInit;
    expect(new Headers(saveInit.headers).get('If-None-Match')).toBe('*');
  });

  it('classifies a stale conditional save as a persistence conflict', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(project, 200, '"rev-a"'))
      .mockResolvedValueOnce(response({ error: 'conflict' }, 412));
    const backend = new FieldBackend({ fetchImpl: fetchImpl as typeof fetch });

    await backend.loadProject('local');
    await expect(backend.saveProject('local', project)).rejects.toBeInstanceOf(PersistenceConflictError);
  });

  it('migrates a valid legacy local snapshot exactly when remote state is absent', async () => {
    const legacyLoader = vi.fn(async () => project);
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ error: 'not found' }, 404))
      .mockResolvedValueOnce(response({ ok: true }, 200, '"rev-a"'))
      .mockResolvedValueOnce(response(project, 200, '"rev-a"'));
    const backend = new FieldBackend({
      fetchImpl: fetchImpl as typeof fetch,
      legacyLoader,
    });

    expect(await backend.loadProject('local')).toEqual(project);
    expect(legacyLoader).toHaveBeenCalledTimes(1);
    const migrationPut = fetchImpl.mock.calls[1][1] as RequestInit;
    expect(migrationPut.method).toBe('PUT');
    expect(new Headers(migrationPut.headers).get('If-None-Match')).toBe('*');
  });

  it('never consults legacy local state when a remote project already exists', async () => {
    const legacyLoader = vi.fn(async () => ({ ...project, files: { stale: 'legacy' } }));
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(project, 200, '"remote"'));
    const backend = new FieldBackend({ fetchImpl: fetchImpl as typeof fetch, legacyLoader });

    expect(await backend.loadProject('local')).toEqual(project);
    expect(legacyLoader).not.toHaveBeenCalled();
  });
});

describe('FieldBackend project metadata', () => {
  it('round-trips project name metadata with revision-aware writes', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ name: 'field' }, 200, '"meta-a"'))
      .mockResolvedValueOnce(response({ ok: true }, 200, '"meta-b"'));
    const backend = new FieldBackend({ fetchImpl: fetchImpl as typeof fetch });

    expect(await backend.getWebsiteName('local')).toBe('field');
    await backend.renameWebsite('local', 'field two');
    const init = fetchImpl.mock.calls[1][1] as RequestInit;
    expect(new Headers(init.headers).get('If-Match')).toBe('"meta-a"');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'field two' });
  });

  it('migrates the optimistic local name only when remote metadata is absent', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ error: 'not found' }, 404))
      .mockResolvedValueOnce(response({ ok: true }, 200, '"meta-a"'))
      .mockResolvedValueOnce(response({ name: 'Legacy Name' }, 200, '"meta-a"'));
    const backend = new FieldBackend({
      fetchImpl: fetchImpl as typeof fetch,
      legacyNameReader: () => 'Legacy Name',
    });

    expect(await backend.getWebsiteName('local')).toBe('Legacy Name');
    const init = fetchImpl.mock.calls[1][1] as RequestInit;
    expect(new Headers(init.headers).get('If-None-Match')).toBe('*');
  });
});


describe('autosave conflict classification', () => {
  it('never classifies a persistence conflict as retryable', () => {
    expect(isRetryableSaveError(new PersistenceConflictError())).toBe(false);
    expect(isRetryableSaveError(new Error('503'))).toBe(true);
  });
});
