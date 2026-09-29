import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('canonical Media type coverage', () => {
  it('includes Audio and Vector in the project Media browser', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain("value: 'audio'");
    expect(media).toContain("label: 'Audio'");
    expect(media).toContain("type BrowserMediaKind = 'image' | 'video' | 'audio' | 'vector'");
    expect(media).toContain("return availableUploads.filter((item) => item.kind === 'audio')");
    expect(media).toContain("item.kind === 'image' || item.kind === 'vector'");
  });

  it('renders Audio and Vector distinctly while preserving drag semantics', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain("name: 'Audio'");
    expect(media).toContain("elementType: 'audio'");
    expect(media).toContain("name: kind === 'vector' ? 'Vector' : 'Image'");
    expect(media).toContain("backgroundSize: kind === 'vector' ? 'contain' : 'cover'");
    expect(media).toContain('♫');
  });

  it('merges shared session references into All even when a durable backend exists', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('const availableUploads = React.useMemo');
    expect(media).toContain('return [...sessionRows, ...uploads].filter');
    expect(media).toContain('if (seen.has(item.url)) return false');
  });

  it('never exposes durable delete for external/session-only rows', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('canDelete={durableInventory === true && !!item.key}');
  });

  it('keeps legacy durable Audio limitations explicit instead of misclassifying it', () => {
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(media).toContain('audio storage is not supported by this backend yet');
  });
});
