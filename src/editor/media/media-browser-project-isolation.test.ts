import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Media browser project isolation', () => {
  it('clears browser-local rows before hydrating a newly mounted project', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(browser).toContain('setUploads([])');
    expect(browser).toContain('setInspectedIdentity(null)');
    expect(browser).toContain('setDuplicateCandidates([])');
    expect(browser).toContain('}, [projectId]);');
  });

  it('never retains old durable rows when the next backend is session-only', () => {
    const browser = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    const nullBranch = browser.slice(
      browser.indexOf('if (assets === null)'),
      browser.indexOf('} else {', browser.indexOf('if (assets === null)')),
    );
    expect(nullBranch).toContain('setUploads([])');
    expect(nullBranch).toContain('setDurableInventory(false)');
  });
});
