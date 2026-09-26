// field-projects.ts — dashboard-only project index/actions for hosted field.
// Project content remains owned by FieldBackend/current.json; this module only
// works with lightweight dashboard metadata and deterministic project actions.

const API_ROOT = '/api/field/projects';

export interface FieldProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  trashedAt: string | null;
  thumbnail?: string | null;
}

interface ProjectListResponse {
  projects?: unknown;
}

interface ProjectMutationResponse {
  project?: unknown;
}

type MetaPatch = Partial<Pick<FieldProjectMeta, 'name' | 'starred' | 'trashedAt' | 'thumbnail'>>;

function projectPath(id: string, suffix = ''): string {
  return `${API_ROOT}/${encodeURIComponent(id)}${suffix}`;
}

function isFieldProjectMeta(value: unknown): value is FieldProjectMeta {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    typeof row.createdAt === 'string' &&
    typeof row.updatedAt === 'string' &&
    typeof row.starred === 'boolean' &&
    (row.trashedAt === null || typeof row.trashedAt === 'string') &&
    (row.thumbnail === undefined || row.thumbnail === null || typeof row.thumbnail === 'string')
  );
}

async function responseError(response: Response, label: string): Promise<Error> {
  const body = await response.text().catch(() => '');
  return new Error(`${label} failed: ${response.status}${body ? ` ${body}` : ''}`);
}

async function readProjectMutation(response: Response, label: string): Promise<FieldProjectMeta> {
  if (!response.ok) throw await responseError(response, label);
  const body = await response.json().catch(() => null) as ProjectMutationResponse | null;
  if (!isFieldProjectMeta(body?.project)) {
    throw new Error(`${label} returned malformed project metadata`);
  }
  return body.project;
}

export async function listFieldProjects(fetchImpl: typeof fetch = fetch): Promise<FieldProjectMeta[]> {
  const response = await fetchImpl(API_ROOT, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw await responseError(response, 'Project list');

  const body = await response.json().catch(() => null) as ProjectListResponse | null;
  if (!Array.isArray(body?.projects) || !body.projects.every(isFieldProjectMeta)) {
    throw new Error('Project list returned malformed metadata');
  }
  return body.projects;
}

export async function createFieldProject(fetchImpl: typeof fetch = fetch): Promise<FieldProjectMeta> {
  const response = await fetchImpl(API_ROOT, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  return readProjectMutation(response, 'Project create');
}

function normalizeR2Revision(value: string): string {
  const revision = value.trim();

  // R2 gives the Worker a strong quoted object ETag, but Cloudflare may weaken
  // the HTTP response validator in transit:
  //
  //   "abc" -> W/"abc"
  //
  // Dashboard metadata updates reuse this value as an If-Match precondition,
  // so restore the original strong R2 spelling before sending it back.
  return revision.startsWith('W/') ? revision.slice(2) : revision;
}

async function getMetaRevision(
  id: string,
  fetchImpl: typeof fetch,
): Promise<{ revision: string | null }> {
  const response = await fetchImpl(projectPath(id, '/meta'), {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (response.status === 404) return { revision: null };
  if (!response.ok) throw await responseError(response, 'Project metadata load');

  const rawRevision = response.headers.get('ETag');
  if (!rawRevision) {
    throw new Error('Project metadata load succeeded without an ETag');
  }

  const revision = normalizeR2Revision(rawRevision);
  if (!revision) {
    throw new Error('Project metadata load returned an empty ETag');
  }

  return { revision };
}

async function updateFieldProjectMeta(
  id: string,
  patch: MetaPatch,
  fetchImpl: typeof fetch = fetch,
  retry = true,
): Promise<FieldProjectMeta> {
  const { revision } = await getMetaRevision(id, fetchImpl);
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  if (revision) headers.set('If-Match', revision);
  else headers.set('If-None-Match', '*');

  const response = await fetchImpl(projectPath(id, '/meta'), {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify(patch),
  });

  if (response.status === 412 && retry) {
    return updateFieldProjectMeta(id, patch, fetchImpl, false);
  }

  return readProjectMutation(response, 'Project metadata update');
}

export function renameFieldProject(
  id: string,
  name: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FieldProjectMeta> {
  return updateFieldProjectMeta(id, { name: name.trim() }, fetchImpl);
}

export function setFieldProjectStarred(
  id: string,
  starred: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<FieldProjectMeta> {
  return updateFieldProjectMeta(id, { starred }, fetchImpl);
}

export function trashFieldProject(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FieldProjectMeta> {
  return updateFieldProjectMeta(id, { trashedAt: new Date().toISOString() }, fetchImpl);
}

export function restoreFieldProject(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FieldProjectMeta> {
  return updateFieldProjectMeta(id, { trashedAt: null }, fetchImpl);
}

export async function duplicateFieldProject(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FieldProjectMeta> {
  const response = await fetchImpl(projectPath(id, '/duplicate'), {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  return readProjectMutation(response, 'Project duplicate');
}

export async function permanentlyDeleteFieldProject(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(projectPath(id), {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 204) return;
  if (!response.ok) throw await responseError(response, 'Project delete');
}
/* FIELD_PROJECT_THUMBNAIL_CLIENT_START */
export interface FieldProjectThumbnailState {
  exists: boolean;
  stale: boolean;
  thumbnailUpdatedAt: string | null;
  projectUpdatedAt: string | null;
}

function parseThumbnailClock(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function thumbnailDataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) throw new Error('Thumbnail capture did not return a supported image data URL');
  const binary = atob(match[2].replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes.buffer], { type: match[1] });
}

export async function getFieldProjectThumbnailState(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FieldProjectThumbnailState> {
  const response = await fetchImpl(projectPath(id, '/thumbnail'), {
    method: 'HEAD',
    credentials: 'include',
    cache: 'no-store',
  });

  const projectUpdatedAt = parseThumbnailClock(response.headers.get('X-Field-Project-Updated-At'));
  const thumbnailUpdatedAt = parseThumbnailClock(response.headers.get('X-Field-Thumbnail-Updated-At'));
  if (response.status === 404) {
    return { exists: false, stale: true, thumbnailUpdatedAt: null, projectUpdatedAt };
  }
  if (!response.ok) throw await responseError(response, 'Project thumbnail status');

  const stale = Boolean(
    projectUpdatedAt &&
    thumbnailUpdatedAt &&
    Date.parse(projectUpdatedAt) > Date.parse(thumbnailUpdatedAt),
  );
  return { exists: true, stale, thumbnailUpdatedAt, projectUpdatedAt };
}

export async function uploadFieldProjectThumbnail(
  id: string,
  dataUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const blob = thumbnailDataUrlToBlob(dataUrl);
  const response = await fetchImpl(projectPath(id, '/thumbnail'), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': blob.type,
      Accept: 'application/json',
    },
    body: blob,
  });
  if (!response.ok) throw await responseError(response, 'Project thumbnail upload');
  const body = await response.json().catch(() => null) as { url?: unknown } | null;
  if (typeof body?.url !== 'string' || !body.url) {
    throw new Error('Project thumbnail upload succeeded without a URL');
  }
  return body.url;
}
/* FIELD_PROJECT_THUMBNAIL_CLIENT_END */
