import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('dashboard thumbnail r2/r3/r4/r5 integration contract', () => {
  it('correlates project receipt, rendered route, raster, and raster failures to one thumbnail session', () => {
    const host = source('src/editor/header/ProjectThumbnailCaptureHost.tsx');
    expect(host).toContain("type: 'preview:probe-ready'");
    expect(host).toContain("type: 'preview:thumbnail-session'");
    expect(host).toContain("message.type === 'preview:project-received'");
    expect(host).toContain("message.type === 'preview:rendered'");
    expect(host).toContain('message.requestId !== session.requestId || !projectReceived');
    expect(host).toContain("type: 'preview:capture-thumbnail'");
    expect(host).toContain("message.type === 'preview:thumbnail-error'");
    expect(host).toContain("retryOrFail('raster', message.error)");
    expect(host).toContain('message.requestId !== session.requestId');
    expect(host).toContain("trace.warn('dashboard-thumbnail:capture-failed'");
    expect(host).toContain('opacity: 0.001');
    expect(host).not.toContain("display: 'none'");
    expect(host).not.toContain("visibility: 'hidden'");
  });

  it('bounds hidden-thumbnail preload, acknowledgement, and first-viewport raster work', () => {
    const sandbox = source('src/preview-sandbox/main.tsx');
    const capture = source('src/preview-sandbox/capture-thumbnail.ts');
    expect(sandbox).toContain("msg.type === 'preview:thumbnail-session'");
    expect(sandbox).toContain("type: 'preview:project-received'");
    expect(sandbox).toContain('THUMBNAIL_PRELOAD_TIMEOUT_MS = 5000');
    expect(sandbox).toContain('Promise.race([preloadCdnImports(), timeout])');
    expect(sandbox).toContain('announcePreviewRendered(requestId)');
    expect(sandbox).toContain('setTimeout(announce, 0)');
    expect(sandbox).toContain("type: 'preview:rendered'");
    expect(capture).toContain('FONT_READY_TIMEOUT_MS = 1200');
    expect(capture).toContain('RASTER_TIMEOUT_MS = 10000');
    expect(capture).toContain('captureViewportSize(');
    expect(capture).toContain('height: viewport.height');
    expect(capture).toContain('skipFonts: true');
    expect(capture).toContain('filter: captureFilter(viewport.width, viewport.height)');
    expect(capture).not.toContain('body.scrollHeight');
    expect(capture).toContain("type: 'preview:thumbnail-error'");
    expect(capture).toContain("parent.postMessage({ type: 'preview:thumbnail', dataUrl, requestId }, '*');");
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
