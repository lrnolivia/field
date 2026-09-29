import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media Create availability', () => {
  it('keeps Create discoverable without presenting a fake image generator', () => {
    const image = read('src/editor/ui/ImageSearchModal.tsx');
    expect(image).toContain('data-media-create-unavailable="image"');
    expect(image).toContain('Image generation is not connected in this build yet.');
    expect(image).toContain('Use Upload, a URL, or Unsplash for now.');
    expect(image).not.toContain('from-purple-500 to-pink-500');
    expect(image).not.toContain('Connect your Replicate or DALL-E API key');
  });

  it('keeps Create discoverable without presenting a fake video generator', () => {
    const video = read('src/editor/ui/VideoSearchModal.tsx');
    expect(video).toContain('data-media-create-unavailable="video"');
    expect(video).toContain('Video generation is not connected in this build yet.');
    expect(video).toContain('Use Upload, a URL, or Pixabay for now.');
    expect(video).not.toContain('Connect your Runway or Pika API key');
  });
});
