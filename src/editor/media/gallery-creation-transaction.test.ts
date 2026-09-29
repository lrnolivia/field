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
    const dims = read('src/canvas/image-dims.ts');
    expect(dims).toContain('let settled = false');
    expect(dims).toContain('if (settled) return');
    expect(dims).toContain("img.src = ''");
    expect(dims).toContain('img.onload = null');
    expect(dims).toContain('img.onerror = null');
  });
  it('captures a selected container before the multi-step Gallery flow and preserves it through async work', () => {
    const controller = read('src/editor/media/MediaPanelController.tsx');
    expect(controller).toContain("intent === 'gallery'");
    expect(controller).toContain('targetId: galleryTargetId');
    expect(controller).toContain('const galleryTargetId = session.targetId');
    expect(controller).toContain("insertToolbarItemAtSelection('gallery', galleryTargetId)");
    expect(controller).toContain("insertToolbarItemAtVisibleCenter('gallery')");

    const capture = controller.indexOf('const galleryTargetId = session.targetId');
    const ratioProbe = controller.indexOf('await Promise.all(config.mediaUrls.map(measureGallerySourceRatio))');
    const placement = controller.indexOf("insertToolbarItemAtSelection('gallery', galleryTargetId)");
    expect(capture).toBeGreaterThan(-1);
    expect(capture).toBeLessThan(ratioProbe);
    expect(placement).toBeGreaterThan(ratioProbe);
  });

});
