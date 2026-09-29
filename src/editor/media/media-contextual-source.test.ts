import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('contextual Media source controls', () => {
  it('keeps Image source inside the inspector instead of opening a standalone modal', () => {
    const image = read('src/editor/tools/ImageTool.tsx');
    expect(image).toContain('data-contextual-media-picker="image-source"');
    expect(image).toContain('<ImageSearchModal');
    expect(image).toContain('embedded');
    expect(image).toContain('compact');
    expect(image).toContain('setMediaOpen(false)');
    expect(image).not.toContain('imageModalOpen');
    expect(image).not.toContain('isOpen={imageModalOpen}');
  });

  it('keeps Video source and poster inside the inspector', () => {
    const video = read('src/editor/tools/VideoTool.tsx');
    expect(video).toContain('data-contextual-media-picker="video-source"');
    expect(video).toContain('data-contextual-media-picker="video-poster"');
    expect(video).toContain('<VideoSearchModal');
    expect(video).toContain('<ImageSearchModal');
    expect(video).toContain('embedded');
    expect(video).toContain('compact');
    expect(video).not.toContain('videoModalOpen');
    expect(video).not.toContain('posterModalOpen');
  });

  it('uses compact source rows instead of legacy dashed upload slabs', () => {
    const video = read('src/editor/tools/VideoTool.tsx');
    expect(video).toContain('Choose media');
    expect(video).toContain('h-9 flex items-center gap-2');
    expect(video).not.toContain('border-2 border-dashed');
    expect(video).not.toContain('w-full h-20');
  });
});
