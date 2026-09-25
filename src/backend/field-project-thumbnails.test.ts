import { describe, expect, it, vi } from 'vitest';
import {
  getFieldProjectThumbnailState,
  thumbnailDataUrlToBlob,
  uploadFieldProjectThumbnail,
} from './field-projects';

describe('field project thumbnail API client', () => {
  it('decodes the Preview JPEG data URL without changing its MIME type', async () => {
    const blob = thumbnailDataUrlToBlob('data:image/jpeg;base64,aGVsbG8=');
    expect(blob.type).toBe('image/jpeg');
    expect(await blob.text()).toBe('hello');
  });

  it('rejects non-image and unsupported capture payloads', () => {
    expect(() => thumbnailDataUrlToBlob('data:text/plain;base64,aGVsbG8=')).toThrow();
    expect(() => thumbnailDataUrlToBlob('data:image/gif;base64,R0lGODlh')).toThrow();
  });

  it('reports missing and stale thumbnail state from HEAD clocks', async () => {
    const missing = vi.fn(async () => new Response(null, {
      status: 404,
      headers: { 'X-Field-Project-Updated-At': '2026-09-25T03:00:00Z' },
    })) as unknown as typeof fetch;
    await expect(getFieldProjectThumbnailState('abc', missing)).resolves.toMatchObject({
      exists: false,
      stale: true,
    });

    const stale = vi.fn(async () => new Response(null, {
      status: 200,
      headers: {
        'X-Field-Project-Updated-At': '2026-09-25T03:00:00Z',
        'X-Field-Thumbnail-Updated-At': '2026-09-25T02:00:00Z',
      },
    })) as unknown as typeof fetch;
    await expect(getFieldProjectThumbnailState('abc', stale)).resolves.toMatchObject({
      exists: true,
      stale: true,
    });
  });

  it('uploads image bytes directly to the project thumbnail route', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('PUT');
      expect(new Headers(init?.headers).get('Content-Type')).toBe('image/jpeg');
      expect(init?.body).toBeInstanceOf(Blob);
      return Response.json({ url: '/api/field/projects/abc/thumbnail?v=1' });
    }) as unknown as typeof fetch;

    await expect(uploadFieldProjectThumbnail(
      'abc',
      'data:image/jpeg;base64,aGVsbG8=',
      fetchImpl,
    )).resolves.toBe('/api/field/projects/abc/thumbnail?v=1');

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/field/projects/abc/thumbnail',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    );
  });
});
