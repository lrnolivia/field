import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Audio contextual Media', () => {
  it('adds project Media selection inline in the Audio Source inspector', () => {
    const audio = read('src/editor/tools/AudioTool.tsx');
    expect(audio).toContain('data-contextual-media-picker="audio-source"');
    expect(audio).toContain('<MediaGalleryPanel');
    expect(audio).toContain('chrome="embedded"');
    expect(audio).toContain('initialTab="audio"');
    expect(audio).toContain("if (asset.kind === 'audio') applyMediaAudio(asset.url)");
  });

  it('uses the compact Choose media row while preserving direct URL control', () => {
    const audio = read('src/editor/tools/AudioTool.tsx');
    expect(audio).toContain('Choose media');
    expect(audio).toContain('aria-expanded={mediaOpen}');
    expect(audio).toContain('h-8 flex items-center gap-2');
    expect(audio).toContain('data-audio-src-input');
    expect(audio).toContain('<ToolInput');
  });

  it('applies the chosen project Audio source through the existing canvas attribute path', () => {
    const audio = read('src/editor/tools/AudioTool.tsx');
    expect(audio).toContain("getCanvasBridge().setAttribute(nodeId, getViewportPrefix(vpId), 'src', url)");
    expect(audio).toContain('setMediaOpen(false)');
  });
});
