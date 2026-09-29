import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Gallery creation transaction', () => {
  it('tracks the inserted Gallery root until finalization commits', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(controller).toContain('let galleryId: string | null = null');
    expect(controller).toContain('let committed = false');
    expect(controller).toContain('galleryId = created[0] ?? null');
    expect(controller).toContain('committed = true');
  });

  it('rolls an inserted Gallery root back on post-insertion failure', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(controller).toContain('if (galleryId && !committed)');
    expect(controller).toContain("queueMutations([{ type: 'removeNode', nodeId: galleryId }])");
    expect(controller).toContain('completeGalleryCreationSession(galleryId)');
  });

  it('settles intrinsic-ratio probes once and abandons timed-out image loads', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(controller).toContain('let settled = false');
    expect(controller).toContain('if (settled) return');
    expect(controller).toContain("image.src = ''");
    expect(controller).toContain('image.onload = null');
    expect(controller).toContain('image.onerror = null');
  });
});
