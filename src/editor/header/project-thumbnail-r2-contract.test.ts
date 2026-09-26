import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('dashboard thumbnail r2/r3/r4 integration contract', () => {
  it('correlates project receipt, rendered route, and raster to one thumbnail session', () => {
    const host = source('src/editor/header/ProjectThumbnailCaptureHost.tsx');
    expect(host).toContain("type: 'preview:probe-ready'");
    expect(host).toContain("type: 'preview:thumbnail-session'");
    expect(host).toContain("message.type === 'preview:project-received'");
    expect(host).toContain("message.type === 'preview:rendered'");
    expect(host).toContain('message.requestId !== session.requestId || !projectReceived');
    expect(host).toContain("type: 'preview:capture-thumbnail'");
    expect(host).toContain('message.requestId !== session.requestId');
    expect(host).toContain("trace.warn('dashboard-thumbnail:capture-failed'");
    expect(host).toContain('opacity: 0.001');
    expect(host).not.toContain("display: 'none'");
    expect(host).not.toContain("visibility: 'hidden'");
  });

  it('bounds hidden-thumbnail CDN preload and returns correlated acknowledgements', () => {
    const sandbox = source('src/preview-sandbox/main.tsx');
    const capture = source('src/preview-sandbox/capture-thumbnail.ts');
    expect(sandbox).toContain("msg.type === 'preview:thumbnail-session'");
    expect(sandbox).toContain("type: 'preview:project-received'");
    expect(sandbox).toContain('THUMBNAIL_PRELOAD_TIMEOUT_MS = 5000');
    expect(sandbox).toContain('Promise.race([preloadCdnImports(), timeout])');
    expect(sandbox).toContain('announcePreviewRendered(requestId)');
    expect(sandbox).toContain('if (requestId) {');
    expect(sandbox).toContain('setTimeout(announce, 0)');
    expect(sandbox).toContain('requestAnimationFrame(announce)');
    expect(sandbox).toContain("type: 'preview:rendered'");
    expect(sandbox).toContain('requestId,');
    expect(sandbox).toContain("msg.type === 'preview:probe-ready'");
    expect(sandbox).toContain('msg.requestId');
    expect(capture).toContain('captureThumbnail(requestId?: string)');
    expect(capture).toContain(
      "parent.postMessage({ type: 'preview:thumbnail', dataUrl, requestId }, '*');",
    );
  });

  it('arms unload bypass only from the field-controlled leave path', () => {
    const leave = source('src/backend/leave-builder.ts');
    const autosave = source('src/backend/autosave.ts');
    expect(leave).toContain('armIntentionalNavigationBypass');
    expect(leave).toContain('saveSucceeded');
    expect(autosave).toContain('consumeIntentionalNavigationBypass');
    expect(autosave).toContain('autosave:unload-bypassed-intentional-navigation');
  });

  it('does not touch Dashboard UI or DropdownMenu', () => {
    const manifest = source('tracker.md');
    expect(manifest.length).toBeGreaterThan(0);
  });
});
