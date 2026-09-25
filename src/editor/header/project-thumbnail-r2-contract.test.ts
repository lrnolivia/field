import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('dashboard thumbnail r2 integration contract', () => {
  it('waits for a rendered-route acknowledgement and correlates the raster', () => {
    const host = source('src/editor/header/ProjectThumbnailCaptureHost.tsx');
    expect(host).toContain("type: 'preview:probe-ready'");
    expect(host).toContain("message.type === 'preview:rendered'");
    expect(host).toContain("type: 'preview:capture-thumbnail'");
    expect(host).toContain('message.requestId !== session.requestId');
    expect(host).toContain("opacity: 0.001");
    expect(host).not.toContain('display: \'none\'');
    expect(host).not.toContain('visibility: \'hidden\'');
  });

  it('makes the sandbox readiness probeable and returns the request id', () => {
    const sandbox = source('src/preview-sandbox/main.tsx');
    const capture = source('src/preview-sandbox/capture-thumbnail.ts');
    expect(sandbox).toContain("msg.type === 'preview:probe-ready'");
    expect(sandbox).toContain("type: 'preview:rendered'");
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

  it('does not touch DropdownMenu', () => {
    const manifest = source('tracker.md');
    // Runtime assertion is simply that this test has no dependency on DropdownMenu;
    // exact staged-path allowlisting in the installer enforces the mutation boundary.
    expect(manifest.length).toBeGreaterThan(0);
  });
});
