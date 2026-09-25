// field-backend.ts — field-hosted ProjectBackend backed by the same-origin
// Cloudflare Worker + R2. R2 is durable EDITOR WORKING STATE only; published
// website/source truth remains the later GitHub bridge.

import type { ProjectBackend, ProjectData, RevymeUser, WorkspaceFont } from './types';
import { isKnownProjectFormat } from './types';
import { LocalBackend } from './local-backend';
import { trace } from '@/shared/debug-trace';

const API_PREFIX = '/api/field/projects';
const ACCESS_IDENTITY_PATH = '/cdn-cgi/access/get-identity';
const LEGACY_PROJECT_NAME_PREFIX = 'revyme:project-name:';

export class PersistenceConflictError extends Error {
  readonly code = 'PERSISTENCE_CONFLICT';
  readonly status = 412;

  constructor(message = 'Remote project changed in another session.') {
    super(message);
    this.name = 'PersistenceConflictError';
  }
}

export function isPersistenceConflictError(error: unknown): error is PersistenceConflictError {
  return error instanceof PersistenceConflictError || (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'PERSISTENCE_CONFLICT'
  );
}

interface FieldBackendOptions {
  fetchImpl?: typeof fetch;
  legacyLoader?: (id: string) => Promise<ProjectData | null>;
  legacyNameReader?: (id: string) => string | null;
}

function defaultLegacyNameReader(id: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const value = window.localStorage.getItem(LEGACY_PROJECT_NAME_PREFIX + id)?.trim() ?? '';
    return value || null;
  } catch {
    return null;
  }
}

function projectPath(id: string, suffix = ''): string {
  return `${API_PREFIX}/${encodeURIComponent(id)}${suffix}`;
}

function requireRevision(response: Response, context: string): string {
  const revision = response.headers.get('ETag');
  if (!revision) {
    throw new Error(`${context} succeeded without an ETag revision`);
  }
  return revision;
}

function hasProjectFiles(value: unknown): value is ProjectData {
  if (!value || typeof value !== 'object') return false;
  const files = (value as { files?: unknown }).files;
  if (!files || typeof files !== 'object' || Array.isArray(files)) return false;
  return Object.keys(files as Record<string, unknown>).length > 0;
}

async function responseError(response: Response, label: string): Promise<Error> {
  const body = await response.text().catch(() => '');
  return new Error(`${label} failed: ${response.status}${body ? ` ${body}` : ''}`);
}

/**
 * field's hosted persistence adapter.
 *
 * Important invariants:
 * - every project write is conditional (create-only or If-Match);
 * - an R2 404 is the ONLY condition that may consult legacy localStorage;
 * - existing remote state always wins over browser-local state;
 * - assets remain self-contained data: URLs in ProjectData for this pass.
 */
export class FieldBackend implements ProjectBackend {
  private readonly localFallback = new LocalBackend();
  private readonly fetchImpl: typeof fetch;
  private readonly legacyLoader: (id: string) => Promise<ProjectData | null>;
  private readonly legacyNameReader: (id: string) => string | null;
  private readonly projectRevisions = new Map<string, string | null>();
  private readonly metaRevisions = new Map<string, string | null>();

  constructor(options: FieldBackendOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.legacyLoader = options.legacyLoader ?? ((id) => this.localFallback.loadProject(id));
    this.legacyNameReader = options.legacyNameReader ?? defaultLegacyNameReader;
  }

  async getUser(): Promise<RevymeUser | null> {
    // Hosted field uses Cloudflare Access as its identity boundary. Ask
    // Cloudflare for the authenticated identity instead of exposing the
    // standalone LocalBackend's synthetic "Local User" in production chrome.
    let response: Response;
    try {
      response = await this.fetchImpl(ACCESS_IDENTITY_PATH, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch (error) {
      trace.error('field-backend:user-network-error', { error: String(error) });
      throw error;
    }

    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) {
      throw await responseError(response, 'Access identity load');
    }

    const body = await response.json().catch(() => null) as {
      id?: unknown;
      user_uuid?: unknown;
      name?: unknown;
      email?: unknown;
    } | null;

    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const id =
      typeof body?.user_uuid === 'string' && body.user_uuid.trim()
        ? body.user_uuid.trim()
        : typeof body?.id === 'string' && body.id.trim()
          ? body.id.trim()
          : email;
    const name =
      typeof body?.name === 'string' && body.name.trim()
        ? body.name.trim()
        : email.split('@')[0] || 'You';

    if (!id || !email) {
      throw new Error('Cloudflare Access identity response is incomplete');
    }

    return { id, name, email };
  }

  private async fetchRemoteProject(id: string): Promise<{ found: boolean; data: ProjectData | null }> {
    let response: Response;
    try {
      response = await this.fetchImpl(projectPath(id), {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch (error) {
      trace.error('field-backend:load-network-error', { id, error: String(error) });
      throw error;
    }

    if (response.status === 404) {
      this.projectRevisions.set(id, null);
      return { found: false, data: null };
    }
    if (!response.ok) {
      throw await responseError(response, 'Project load');
    }

    const revision = requireRevision(response, 'Project load');
    this.projectRevisions.set(id, revision);

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch (error) {
      throw new Error(`Project load returned invalid JSON: ${String(error)}`);
    }

    if (!hasProjectFiles(parsed)) {
      // An R2 object already exists, so this is NOT a new-project miss. Treat
      // malformed/fileless remote state as a hard load failure; returning null
      // would make ProjectLoader seed a starter and autosave it over the only
      // remote copy.
      trace.error('field-backend:remote-project-invalid', { id, revision });
      throw new Error('Remote project exists but does not contain a valid project snapshot');
    }
    const data = parsed as ProjectData;
    if (!isKnownProjectFormat(data.format)) {
      // Match the existing safety rule: files present = real authored work.
      // Unknown future format tags are logged, never discarded into an empty
      // starter that autosave could write back over the project.
      trace.error('field-backend:unknown-format', { id, format: data.format });
    }
    trace.action('backend:load-project', {
      id,
      source: 'field-r2',
      revision,
      fileCount: Object.keys(data.files).length,
    });
    return { found: true, data };
  }

  async loadProject(id: string): Promise<ProjectData | null> {
    const remote = await this.fetchRemoteProject(id);
    if (remote.found) return remote.data;

    // One-time migration source. Never consult this after a remote object is
    // present, so stale local state cannot replace R2 state.
    const legacy = await this.legacyLoader(id);
    if (!legacy) {
      trace.action('field-backend:remote-miss-no-legacy', { id });
      return null;
    }

    trace.action('field-backend:legacy-migration-start', {
      id,
      fileCount: Object.keys(legacy.files).length,
    });
    try {
      await this.saveProject(id, legacy); // If-None-Match: *
    } catch (error) {
      if (!isPersistenceConflictError(error)) throw error;
      // Another browser won the create race. That remote state is now the
      // authority; do not retry the stale local copy.
      trace.action('field-backend:legacy-migration-raced', { id });
    }

    const migrated = await this.fetchRemoteProject(id);
    if (!migrated.found) {
      throw new Error('Legacy migration completed without a remote project');
    }
    trace.action('field-backend:legacy-migration-complete', { id });
    return migrated.data;
  }

  async saveProject(id: string, data: ProjectData): Promise<void> {
    const expected = this.projectRevisions.get(id);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (expected) headers.set('If-Match', expected);
    else headers.set('If-None-Match', '*');

    let response: Response;
    try {
      response = await this.fetchImpl(projectPath(id), {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(data),
      });
    } catch (error) {
      trace.error('field-backend:save-network-error', { id, error: String(error) });
      throw error;
    }

    if (response.status === 409 || response.status === 412) {
      trace.error('field-backend:save-conflict', { id, expected });
      throw new PersistenceConflictError();
    }
    if (!response.ok) {
      throw await responseError(response, 'Project save');
    }

    const revision = requireRevision(response, 'Project save');
    this.projectRevisions.set(id, revision);
    trace.action('backend:save-project', {
      id,
      source: 'field-r2',
      revision,
      fileCount: Object.keys(data.files).length,
    });
  }

  private async fetchRemoteName(id: string): Promise<{ found: boolean; name: string | null }> {
    let response: Response;
    try {
      response = await this.fetchImpl(projectPath(id, '/meta'), {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch (error) {
      trace.error('field-backend:get-name-network-error', { id, error: String(error) });
      throw error;
    }

    if (response.status === 404) {
      this.metaRevisions.set(id, null);
      return { found: false, name: null };
    }
    if (!response.ok) {
      trace.error('field-backend:get-name-error', { id, status: response.status });
      throw await responseError(response, 'Project metadata load');
    }

    const revision = requireRevision(response, 'Project metadata load');
    this.metaRevisions.set(id, revision);
    const body = await response.json().catch(() => null) as { name?: unknown } | null;
    return {
      found: true,
      name: typeof body?.name === 'string' ? body.name : null,
    };
  }

  async getWebsiteName(id: string): Promise<string | null> {
    let remote: { found: boolean; name: string | null };
    try {
      remote = await this.fetchRemoteName(id);
    } catch (error) {
      // Name metadata is non-critical to opening the project. Fail soft here,
      // but crucially do NOT reinterpret an unavailable remote read as 404 —
      // that could migrate stale browser-local metadata over remote state.
      trace.error('field-backend:get-name-unavailable', { id, error: String(error) });
      return null;
    }
    if (remote.found) return remote.name;

    // Preserve an existing standalone project name during the same one-time
    // transition as the document. This is only consulted when meta.json does
    // not exist; once remote metadata exists it always wins.
    const legacyName = this.legacyNameReader(id);
    if (!legacyName) return null;

    try {
      await this.renameWebsite(id, legacyName);
    } catch (error) {
      if (!isPersistenceConflictError(error)) {
        trace.error('field-backend:legacy-name-migration-error', { id, error: String(error) });
        return null;
      }
      // Another session created metadata first. Read that authoritative value.
    }

    const migrated = await this.fetchRemoteName(id);
    return migrated.name;
  }

  async renameWebsite(id: string, name: string): Promise<void> {
    const expected = this.metaRevisions.get(id);
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (expected) headers.set('If-Match', expected);
    else headers.set('If-None-Match', '*');

    const response = await this.fetchImpl(projectPath(id, '/meta'), {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ name: name.trim() }),
    });

    if (response.status === 409 || response.status === 412) {
      throw new PersistenceConflictError('Project name changed in another session.');
    }
    if (!response.ok) {
      throw await responseError(response, 'Project rename');
    }
    this.metaRevisions.set(id, requireRevision(response, 'Project rename'));
    trace.action('backend:rename-website', { id, name: name.trim(), source: 'field-r2' });
  }

  async uploadAsset(id: string, file: File): Promise<string> {
    // Keep project snapshots self-contained for this assignment. A later
    // asset-canonicalization pass may externalize bytes and materialize them
    // into GitHub/public source during publish.
    return this.localFallback.uploadAsset(id, file);
  }

  async deleteAssets(id: string, keys: string[]): Promise<void> {
    return this.localFallback.deleteAssets(id, keys);
  }

  async fetchMediaBytes(url: string): Promise<Blob> {
    return this.localFallback.fetchMediaBytes(url);
  }

  async getWebsiteRole(_id: string): Promise<'owner' | 'editor' | 'viewer'> {
    return 'owner';
  }

  async getWebsiteClosedSource(_id: string): Promise<boolean> {
    return false;
  }

  async getWebsiteWorkspaceId(_id: string): Promise<string | null> {
    return null;
  }

  async getCredits(_workspaceId: string): Promise<number | null> {
    return null;
  }

  async listWorkspaceFonts(_workspaceId: string): Promise<WorkspaceFont[]> {
    return [];
  }
}
