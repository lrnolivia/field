import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media browser visual contract', () => {
  it('keeps embedded Media compact while giving the vertical panel a real narrow layout', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('data-media-browser-commandbar');
    expect(media).toContain("data-media-browser-layout={chrome === 'full' ? 'vertical' : 'inline'}");
    expect(media).toContain("layout={chrome === 'full' ? 'grid' : 'inline'}");
    expect(media).toContain("'w-full justify-center'");
    expect(media).toContain("'justify-start pt-12'");
  });

  it('uses photographic 4:3 tiles with restrained selection and hover polish', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const start = media.indexOf('const MediaTile');
    const end = media.indexOf('interface StorageInfo', start);
    const tile = media.slice(start, end);
    expect(tile).toContain('aspect-[4/3]');
    expect(tile).toContain('rounded-[7px]');
    expect(tile).toContain('hover:-translate-y-px');
    expect(tile).toContain('group-hover:scale-[1.015]');
    expect(tile).toContain('border-[var(--accent)] transition-none');
    expect(tile).toContain('opacity: 0.08');
    expect(tile).not.toContain('cut-corners');
    expect(tile).not.toContain('--cut-border-color');
  });

  it('keeps compact Media visually rich without becoming a giant dropzone', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('Drop files here or add them from your computer.');
    expect(media).toContain('Add media');
    expect(media).toContain('h-11 w-14');
    expect(media).not.toContain('border-dashed');
    expect(media).not.toContain('fixed inset-0');
  });

  it('accepts Finder/Desktop file drops through the same batch-ingest path', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('const ingestFiles = useCallback(async (files: File[])');
    expect(media).toContain('await ingestFiles(files)');
    expect(media).toContain('await ingestFiles(Array.from(event.dataTransfer.files ?? []))');
    expect(media).toContain('data-media-browser-drop-target');
    expect(media).toContain('Add to Media');
  });

  it('uses restrained local drag feedback instead of a giant dashed dropzone', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain("background: 'color-mix(in srgb, var(--accent) 5%, transparent)'");
    expect(media).toContain('border border-[var(--accent)]');
    expect(media).not.toContain('border-dashed');
  });

  it('ignores internal Media drags by requiring native Files data', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain("Array.from(event.dataTransfer.types).includes('Files')");
  });
});
