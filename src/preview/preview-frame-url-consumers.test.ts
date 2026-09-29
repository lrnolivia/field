import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('Preview runtime URL consumers', () => {
  it('routes visible Preview and both thumbnail renderers through one resolver', () => {
    const overlay = source('src/editor/header/PreviewOverlay.tsx');
    const warmThumbnail = source('src/editor/header/ProjectThumbnailCaptureHost.tsx');
    const backfill = source('src/dashboard/dashboard-thumbnail-backfill.ts');

    for (const consumer of [overlay, warmThumbnail, backfill]) {
      expect(consumer).toContain("from '@/preview/preview-frame-url'");
      expect(consumer).not.toContain('preview.${window.location.hostname}');
    }

    expect(warmThumbnail).toContain('src={previewUrl()}');
    expect(backfill).toContain('private readonly url = previewFrameUrl(window.location)');
    expect(backfill).toContain('private readonly origin = new URL(this.url).origin');
  });
});
