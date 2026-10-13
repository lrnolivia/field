import { describe, expect, it, vi } from 'vitest';

vi.mock('@/code/project/project-fs', () => ({
  projectFS: {
    listFiles: () => ['app/page.client.tsx', 'app/globals.css'],
    readFile: (path: string) => path === 'app/globals.css'
      ? ':root { --page-bg: white; } :root.dark { --page-bg: black; }'
      : '<main />',
  },
}));
vi.mock('@/code/mutation/mutation-queue', () => ({ flushNow: vi.fn() }));
vi.mock('@/code/project/preset-ops', () => ({ migrateLegacyDarkBlock: (css: string) => css }));
vi.mock('@/canvas/canvas-theme', () => ({ canvasThemeMode: () => 'light' }));

import {
  collectPreviewProjectPayload,
  extractPreviewTokenCss,
  postPreviewProjectPayload,
} from './preview-project-payload';

describe('Preview project payload helpers', () => {
  it('extracts the same root token blocks Preview injects today', () => {
    const result = extractPreviewTokenCss(`
      body { margin: 0; }
      :root { --page-bg: white; --ink: black; }
      .thing { color: red; }
      :root.dark { --page-bg: #111; --ink: white; }
    `);
    expect(result.count).toBe(2);
    expect(result.css).toContain(':root { --page-bg: white; --ink: black; }');
    expect(result.css).toContain(':root.dark { --page-bg: #111; --ink: white; }');
  });

  it('collects files, theme, locale, and token blocks in one canonical payload', () => {
    const payload = collectPreviewProjectPayload('en');
    expect(payload.files).toEqual([
      ['app/page.client.tsx', '<main />'],
      ['app/globals.css', ':root { --page-bg: white; } :root.dark { --page-bg: black; }'],
    ]);
    expect(payload.theme).toBe('light');
    expect(payload.locale).toBe('en');
    expect(payload.tokenBlockCount).toBe(2);
  });

  it('posts theme, locale, files, then tokens through one protocol helper', () => {
    const postMessage = vi.fn();
    postPreviewProjectPayload({ postMessage }, {
      files: [['app/page.client.tsx', '<main />']],
      theme: 'light',
      locale: 'en',
      tokensCss: ':root { --x: 1; }',
      tokenBlockCount: 1,
    });
    expect(postMessage.mock.calls.map((call) => call[0].type)).toEqual([
      'preview:force-theme',
      'preview:force-locale',
      'preview:project-files',
      'preview:tokens',
    ]);
  });
});
