import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media browser visual contract', () => {
  it('keeps search and Add media in one compact command row', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('Search + ingest are one compact command row');
    expect(media).toContain('className="min-w-0 flex-1"');
    expect(media).toContain("'Add media'");
    expect(media).toContain('h-7 shrink-0');
    expect(media).not.toContain('w-full flex items-center justify-center gap-2 py-2');
  });

  it('uses restrained media tiles instead of inherited cut-corner cards', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const start = media.indexOf('const MediaTile');
    const end = media.indexOf('interface StorageInfo', start);
    const tile = media.slice(start, end);
    expect(tile).toContain('rounded-[4px]');
    expect(tile).toContain('border-[var(--accent)] transition-none');
    expect(tile).toContain('opacity: 0.08');
    expect(tile).not.toContain('cut-corners');
    expect(tile).not.toContain('--cut-border-color');
  });

  it('keeps empty Media compact and actionable', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('Drop files here or add them from your computer.');
    expect(media).toContain('Add media');
    expect(media).not.toContain('width="40" height="40"');
  });
});
