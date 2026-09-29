import test from 'node:test';
import assert from 'node:assert/strict';
import { handleFieldBuildRequest } from './worker.js';

test('build endpoint combines emitted build metadata with Cloudflare version truth', async () => {
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
  assert.equal(response?.status, 200);
  assert.deepEqual(await response?.json(), {
    version: '1.0.0',
    commitSha: 'abcdef1234567890',
    shortSha: 'abcdef12',
    builtAt: '2026-09-29T02:44:00.000Z',
    environment: 'Production',
    deployedAt: '2026-09-29T02:45:00.000Z',
    deploymentId: 'version-abc',
  });
});

test('build endpoint identifies preview hosts', async () => {
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
  assert.equal(body.environment, 'Preview');
});
