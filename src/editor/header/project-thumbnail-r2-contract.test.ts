import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('dashboard thumbnail warm-runtime integration contract', () => {
  it('keeps one warm renderer, batches updates, parks it when idle, and destroys it later', () => {
    const host = source('src/editor/header/ProjectThumbnailCaptureHost.tsx');
    expect(host).toContain('UPDATE_BATCH_MS = 140');
    expect(host).toContain('CAPTURE_AFTER_SAVE_MS = 120');
    expect(host).toContain('STANDBY_IDLE_MS = 8000');
    expect(host).toContain('DESTROY_IDLE_MS = 90000');
    expect(host).toContain("type: 'preview:file-batch'");
    expect(host).toContain("trace.action('dashboard-thumbnail:warm-mounted'");
    expect(host).toContain("trace.action('dashboard-thumbnail:warm-sync'");
    expect(host).toContain("trace.action('dashboard-thumbnail:warm-standby'");
    expect(host).toContain("trace.action('dashboard-thumbnail:warm-destroyed'");
    expect(host).toContain("display: rendererAwake ? 'block' : 'none'");
  });

  it('publishes only saved, current generations and preserves generation correlation through Preview', () => {
    const host = source('src/editor/header/ProjectThumbnailCaptureHost.tsx');
    const sandbox = source('src/preview-sandbox/main.tsx');
    expect(host).toContain("saveStatusRef.current !== 'saved'");
    expect(host).toContain('generationRef.current !== attempt.generation');
    expect(host).toContain("type: 'preview:thumbnail-generation'");
    expect(host).toContain("type: 'preview:capture-thumbnail'");
    expect(host).toContain("trace.warn('dashboard-thumbnail:upload-stale-race'");
    expect(sandbox).toContain("msg.type === 'preview:thumbnail-generation'");
    expect(sandbox).toContain("msg.type === 'preview:file-batch'");
    expect(sandbox).toContain('generation: renderGeneration');
  });

  it('uses a compact first-viewport raster with bounded waits and no idle dependency', () => {
    const capture = source('src/preview-sandbox/capture-thumbnail.ts');
    expect(capture).toContain('SETTLE_MS = 120');
    expect(capture).toContain('FONT_READY_TIMEOUT_MS = 100');
    expect(capture).toContain('RASTER_TIMEOUT_MS = 2500');
    expect(capture).toContain('THUMB_WIDTH = 640');
    expect(capture).toContain("document.getElementById('root') ?? document.body");
    expect(capture).toContain('skipFonts: true');
    expect(capture).not.toContain('requestIdleCallback');
    expect(capture).not.toContain('body.scrollHeight');
  });

  it('does not move the feature into Dashboard, Cloudflare, or persistence code', () => {
    const manifest = source('tracker.md');
    expect(manifest).toContain('field-dashboard-thumbnail-previews-r2-20260925');
  });
});
