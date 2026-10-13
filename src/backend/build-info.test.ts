import { describe, expect, it, vi } from 'vitest';
import { fetchFieldBuildInfo } from './build-info';

describe('fetchFieldBuildInfo', () => {
  it('requests runtime build truth with no-store semantics', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      version: '1.0.0',
      commitSha: '1234567890abcdef',
      shortSha: '12345678',
      builtAt: '2026-09-29T02:00:00.000Z',
      environment: 'Production',
      deployedAt: '2026-09-29T02:01:00.000Z',
      deploymentId: 'worker-version',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const info = await fetchFieldBuildInfo(fetchImpl as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledWith('/api/build', expect.objectContaining({
      method: 'GET',
      cache: 'no-store',
    }));
    expect(info.shortSha).toBe('12345678');
    expect(info.deploymentId).toBe('worker-version');
  });
});
