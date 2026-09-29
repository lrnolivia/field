import { describe, expect, it } from 'vitest';
import {
  mediaNodeAcceptsKind,
  resolveToolbarMediaPlacement,
} from './media-placement';

describe('toolbar Media contextual placement', () => {
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

  it('replaces only a single selected node of the matching media kind', () => {
    const types = new Map([
      ['image-1', 'img'],
      ['video-1', 'video'],
      ['frame-1', 'div'],
    ]);
    const getType = (id: string) => types.get(id);

    expect(resolveToolbarMediaPlacement(['image-1'], 'image', getType))
      .toEqual({ type: 'replace', nodeId: 'image-1' });
    expect(resolveToolbarMediaPlacement(['video-1'], 'video', getType))
      .toEqual({ type: 'replace', nodeId: 'video-1' });
    expect(resolveToolbarMediaPlacement(['video-1'], 'image', getType))
      .toEqual({ type: 'insert' });
    expect(resolveToolbarMediaPlacement(['frame-1'], 'image', getType))
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
    const ingestIndex = controller.indexOf('const result = await ingestMediaFile({');
    const placeIndex = controller.indexOf('placeUrl(elementKind, result.url, placement)');

    expect(placementIndex).toBeGreaterThan(-1);
    expect(placementIndex).toBeLessThan(ingestIndex);
    expect(placeIndex).toBeGreaterThan(ingestIndex);
    expect(controller).toContain("type: 'updateHtmlAttrs'");
    expect(controller).toContain("bridge.setAttribute(placement.nodeId, vpPrefix, 'src', url)");
    expect(controller).toContain("insertToolbarItemAtVisibleCenter(kind, undefined, { src: url })");
  });
});
