import { describe, expect, it } from 'vitest';
import {
  mediaNodeAcceptsChild,
  mediaNodeAcceptsKind,
  resolveDesktopGalleryTarget,
  resolveToolbarMediaPlacement,
} from './media-placement';

describe('toolbar Media contextual placement', () => {
  it('uses a selected page container or the page root for Gallery placement', () => {
    const page = { id: 'root', type: 'main', parentId: null, isCanvasNode: false };
    const frame = { id: 'frame', type: 'div', parentId: 'root', isCanvasNode: false };
    const scratch = { id: 'scratch', type: 'div', parentId: null, isCanvasNode: true };
    const image = { id: 'image', type: 'img', parentId: 'frame', isCanvasNode: false };
    const nodes = [scratch, frame, image, page];
    expect(resolveDesktopGalleryTarget(frame, nodes)).toBe(frame);
    expect(resolveDesktopGalleryTarget(scratch, nodes)).toBe(page);
    expect(resolveDesktopGalleryTarget(image, nodes)).toBe(page);
    expect(resolveDesktopGalleryTarget(undefined, nodes)).toBe(page);
    expect(resolveDesktopGalleryTarget(undefined, [scratch, frame])).toBeUndefined();
    const importedPage = { ...page, id: 'imported-home' };
    expect(resolveDesktopGalleryTarget(undefined, [scratch, importedPage])).toBe(importedPage);
  });

  it('recognizes the existing media node types that can accept a source replacement', () => {
    expect(mediaNodeAcceptsKind('img', 'image')).toBe(true);
    expect(mediaNodeAcceptsKind('Image', 'image')).toBe(true);
    expect(mediaNodeAcceptsKind('motion.img', 'image')).toBe(true);
    expect(mediaNodeAcceptsKind('video', 'video')).toBe(true);
    expect(mediaNodeAcceptsKind('motion.video', 'video')).toBe(true);
    expect(mediaNodeAcceptsKind('audio', 'audio')).toBe(true);
    expect(mediaNodeAcceptsKind('motion.audio', 'audio')).toBe(true);
    expect(mediaNodeAcceptsKind('div', 'image')).toBe(false);
  });

  it('recognizes structural frames/containers that can receive Media children', () => {
    expect(mediaNodeAcceptsChild('div')).toBe(true);
    expect(mediaNodeAcceptsChild('section')).toBe(true);
    expect(mediaNodeAcceptsChild('motion.div')).toBe(true);
    expect(mediaNodeAcceptsChild('img')).toBe(false);
    expect(mediaNodeAcceptsChild('video')).toBe(false);
    expect(mediaNodeAcceptsChild('p')).toBe(false);
  });

  it('replaces only a single selected node of the matching media kind', () => {
    const types = new Map([
      ['image-1', 'img'],
      ['video-1', 'video'],
      ['frame-1', 'div'],
      ['text-1', 'p'],
    ]);
    const getType = (id: string) => types.get(id);

    expect(resolveToolbarMediaPlacement(['image-1'], 'image', getType))
      .toEqual({ type: 'replace', nodeId: 'image-1' });
    expect(resolveToolbarMediaPlacement(['video-1'], 'video', getType))
      .toEqual({ type: 'replace', nodeId: 'video-1' });
    expect(resolveToolbarMediaPlacement(['video-1'], 'image', getType))
      .toEqual({ type: 'insert' });
    expect(resolveToolbarMediaPlacement(['frame-1'], 'image', getType))
      .toEqual({ type: 'inside', nodeId: 'frame-1' });
    expect(resolveToolbarMediaPlacement(['text-1'], 'image', getType))
      .toEqual({ type: 'insert' });
    expect(resolveToolbarMediaPlacement([], 'image', getType))
      .toEqual({ type: 'insert' });
    expect(resolveToolbarMediaPlacement(['image-1', 'video-1'], 'image', getType))
      .toEqual({ type: 'insert' });
  });

  it('captures toolbar upload placement before the asynchronous ingest resolves', () => {
    const controller = require('node:fs').readFileSync(
      'src/editor/media/MediaPanelController.tsx',
      'utf8',
    );
    const placementIndex = controller.indexOf('const placement = resolvePlacement(elementKind)');
    const ingestIndex = controller.indexOf('await ingestMediaFile({');
    const placeIndex = controller.indexOf('placeUrl(elementKind, result.url, placement)');

    expect(placementIndex).toBeGreaterThan(-1);
    expect(placementIndex).toBeLessThan(ingestIndex);
    expect(placeIndex).toBeGreaterThan(ingestIndex);
    expect(controller).toContain("type: 'updateHtmlAttrs'");
    expect(controller).toContain("bridge.setAttribute(placement.nodeId, vpPrefix, 'src', url)");
    expect(controller).toContain("insertToolbarItemAtSelection(kind, placement.nodeId, { src: url }, imageItem)");
    expect(controller).toContain("insertToolbarItemAtVisibleCenter(kind, undefined, { src: url }, imageItem)");
  });

  it('preserves the captured container target through the shared insertion engine', () => {
    const bridge = require('node:fs').readFileSync(
      'src/canvas/insertion-bridge.ts',
      'utf8',
    );
    const insert = require('node:fs').readFileSync(
      'src/canvas/insert-toolbar-item.ts',
      'utf8',
    );
    expect(bridge).toContain('selectionOverride?: readonly string[]');
    expect(bridge).toContain('opts.selectionOverride ?? store.get(selectedIdsAtom)');
    expect(insert).toContain('export function insertToolbarItemAtSelection');
    expect(insert).toContain("{ selectionOverride: [nodeId] }");
  });
});
