import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('dashboard thumbnail r2/r3/r4/r5/r6 integration contract', () => {
  it('prewarms before persistence settles but publishes only the current saved generation', () => {
    const host = source('src/editor/header/ProjectThumbnailCaptureHost.tsx');
    expect(host).toContain('CAPTURE_DELAY_MS = 350');
    expect(host).toContain('CAPTURE_TIMEOUT_MS = 8000');
    expect(host).toContain('MAX_SESSION_RETRIES = 1');
    expect(host).toContain('renderReadySession');
    expect(host).toContain("saveStatus !== 'saved'");
    expect(host).toContain('generationRef.current !== captureSession.generation');
    expect(host).toContain('generationRef.current !== session.generation');
    expect(host).toContain("dashboard-thumbnail:discarded-stale");
    expect(host).toContain("dashboard-thumbnail:waiting-for-save");
    expect(host).toContain("type: 'preview:capture-thumbnail'");
    expect(host).toContain("message.type === 'preview:thumbnail-error'");
  });

  it('uses a bounded background Preview path without changing visible Preview semantics', () => {
    const sandbox = source('src/preview-sandbox/main.tsx');
    expect(sandbox).toContain('THUMBNAIL_PRELOAD_TIMEOUT_MS = 1200');
    expect(sandbox).toContain("msg.type === 'preview:thumbnail-session'");
    expect(sandbox).toContain("type: 'preview:project-received'");
    expect(sandbox).toContain('setTimeout(announce, 0)');
    expect(sandbox).toContain('requestAnimationFrame(announce)');
  });

  it('keeps raster work small and independent of idle scheduling', () => {
    const capture = source('src/preview-sandbox/capture-thumbnail.ts');
    expect(capture).toContain('SETTLE_MS = 400');
    expect(capture).toContain('FONT_READY_TIMEOUT_MS = 250');
    expect(capture).toContain('RASTER_TIMEOUT_MS = 4000');
    expect(capture).toContain('THUMB_WIDTH = 720');
    expect(capture).toContain("document.getElementById('root') ?? document.body");
    expect(capture).toContain('skipFonts: true');
    expect(capture).not.toContain('requestIdleCallback');
    expect(capture).not.toContain('body.scrollHeight');
  });

  it('arms unload bypass only from the field-controlled leave path', () => {
    const leave = source('src/backend/leave-builder.ts');
    const autosave = source('src/backend/autosave.ts');
    expect(leave).toContain('armIntentionalNavigationBypass');
    expect(leave).toContain('saveSucceeded');
    expect(autosave).toContain('consumeIntentionalNavigationBypass');
    expect(autosave).toContain('autosave:unload-bypassed-intentional-navigation');
  });
});
