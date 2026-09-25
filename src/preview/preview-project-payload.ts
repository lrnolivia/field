// preview-project-payload.ts — one canonical ProjectFS → Preview-sandbox payload.
//
// Both the visible Preview overlay and the invisible dashboard-thumbnail capture
// host use this. Keeping one serializer is important: Preview is runtime truth,
// so a project-card thumbnail must be rendered from the same files/theme/locale/
// token payload the user sees in Preview rather than from a parallel renderer.

import { projectFS } from '@/code/project/project-fs';
import { flushNow } from '@/code/mutation/mutation-queue';
import { migrateLegacyDarkBlock } from '@/code/project/preset-ops';
import { canvasThemeMode } from '@/canvas/canvas-theme';

export interface PreviewProjectPayload {
  files: Array<[string, string]>;
  theme: string;
  locale: string;
  tokensCss: string;
  tokenBlockCount: number;
}

export interface PreviewMessageTarget {
  postMessage(message: unknown, targetOrigin: string): void;
}

export function extractPreviewTokenCss(globalsCssContent: string): {
  css: string;
  count: number;
} {
  const rootBlocks: string[] = [];
  const rootMatch = globalsCssContent.match(/:root\s*\{[\s\S]*?\}/);
  if (rootMatch) rootBlocks.push(rootMatch[0]);
  const darkMatch = globalsCssContent.match(/:root\.dark\s*\{[\s\S]*?\}/);
  if (darkMatch) rootBlocks.push(darkMatch[0]);
  return { css: rootBlocks.join('\n'), count: rootBlocks.length };
}

export function collectPreviewProjectPayload(locale: string): PreviewProjectPayload {
  // PreviewOverlay already flushes before snapshotting. Keep that invariant for
  // background thumbnails too, so queued canvas work never produces a stale card.
  flushNow();

  const files: Array<[string, string]> = [];
  let globalsCssContent = '';
  for (const path of projectFS.listFiles()) {
    let content = projectFS.readFile(path);
    if (content === null) continue;
    if (path === 'app/globals.css') {
      content = migrateLegacyDarkBlock(content);
      globalsCssContent = content;
    }
    files.push([path, content]);
  }

  const tokens = extractPreviewTokenCss(globalsCssContent);
  return {
    files,
    theme: canvasThemeMode(),
    locale,
    tokensCss: tokens.css,
    tokenBlockCount: tokens.count,
  };
}

export function postPreviewProjectPayload(
  target: PreviewMessageTarget,
  payload: PreviewProjectPayload,
  targetOrigin = '*',
): void {
  target.postMessage({ type: 'preview:force-theme', theme: payload.theme }, targetOrigin);
  target.postMessage({ type: 'preview:force-locale', locale: payload.locale }, targetOrigin);
  target.postMessage({ type: 'preview:project-files', files: payload.files }, targetOrigin);
  target.postMessage({ type: 'preview:tokens', css: payload.tokensCss }, targetOrigin);
}
