import { describe, expect, it } from 'vitest';
import { handleFieldBuildRequest } from './worker.js';

describe('field build endpoint', () => {
  it('combines emitted build metadata with Cloudflare version truth', async () => {
    const env = {
      FIELD_VERSION: {
        id: 'version-abc',
        timestamp: '2026-09-29T02:45:00.000Z',
      },
      ASSETS: {
        fetch: async () => new Response(JSON.stringify({
          version: '1.0.0',
          commitSha: 'abcdef1234567890',
          shortSha: 'abcdef12',
          builtAt: '2026-09-29T02:44:00.000Z',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      },
    };

    const response = await handleFieldBuildRequest(
      new Request('https://field.loew.fi/api/build'),
      env,
    );
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({
      version: '1.0.0',
      commitSha: 'abcdef1234567890',
      shortSha: 'abcdef12',
      builtAt: '2026-09-29T02:44:00.000Z',
      environment: 'Production',
      deployedAt: '2026-09-29T02:45:00.000Z',
      deploymentId: 'version-abc',
    });
  });

  it('identifies preview hosts', async () => {
    const response = await handleFieldBuildRequest(
      new Request('https://batch.field-preview.loew.fi/api/build'),
      {
        FIELD_VERSION: null,
        ASSETS: {
          fetch: async () => new Response(JSON.stringify({
            version: '1.0.0',
            commitSha: 'abcdef1234567890',
            shortSha: 'abcdef12',
            builtAt: '2026-09-29T02:44:00.000Z',
          })),
        },
      },
    );
    const body = await response?.json();
    expect(body.environment).toBe('Preview');
  });
});
