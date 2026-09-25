// field-profile.ts — field-native per-user presentation state.
//
// Authentication belongs to Cloudflare Access. Profile presentation belongs
// to field and is stored independently from website/project document data.

export interface FieldProfileState {
  hasCustomAvatar: boolean;
  avatarUpdatedAt: string | null;
  avatarUrl: string | null;
}

const PROFILE_API = '/api/field/profile';

async function responseError(response: Response, label: string): Promise<Error> {
  const body = await response.text().catch(() => '');
  return new Error(`${label} failed: ${response.status}${body ? ` ${body}` : ''}`);
}

export async function getFieldProfile(): Promise<FieldProfileState> {
  const response = await fetch(PROFILE_API, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw await responseError(response, 'Profile load');

  const body = await response.json() as Partial<FieldProfileState>;

  return {
    hasCustomAvatar: body.hasCustomAvatar === true,
    avatarUpdatedAt:
      typeof body.avatarUpdatedAt === 'string' ? body.avatarUpdatedAt : null,
    avatarUrl:
      typeof body.avatarUrl === 'string' ? body.avatarUrl : null,
  };
}

export async function uploadFieldAvatar(blob: Blob): Promise<FieldProfileState> {
  const response = await fetch(`${PROFILE_API}/avatar`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': blob.type || 'image/webp',
      Accept: 'application/json',
    },
    body: blob,
  });

  if (!response.ok) throw await responseError(response, 'Avatar upload');
  return await response.json() as FieldProfileState;
}

export async function deleteFieldAvatar(): Promise<FieldProfileState> {
  const response = await fetch(`${PROFILE_API}/avatar`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw await responseError(response, 'Avatar removal');
  return await response.json() as FieldProfileState;
}
