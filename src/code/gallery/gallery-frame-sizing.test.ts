import { describe, expect, it } from 'vitest';
import {
  GALLERY_FRAME_SIZING_STYLE_PROPERTY,
  GALLERY_SOURCE_RATIO_STYLE_PROPERTY,
  formatGallerySourceRatio,
  galleryCarouselSourceImageWidth,
  gallerySourceAspectRatio,
  gallerySourceRatioPatch,
  normalizeGalleryFrameSizing,
  normalizeGallerySourceRatio,
  parseGallerySourceRatio,
} from './gallery-frame-sizing';

describe('Gallery frame sizing', () => {
  it('keeps frame sizing a small source-backed semantic state', () => {
    expect(GALLERY_FRAME_SIZING_STYLE_PROPERTY).toBe('--field-gallery-frame-sizing');
    expect(GALLERY_SOURCE_RATIO_STYLE_PROPERTY).toBe('--field-gallery-source-ratio');
    expect(normalizeGalleryFrameSizing('source')).toBe('source');
    expect(normalizeGalleryFrameSizing('anything-else')).toBe('composed');
  });

  it('normalizes persisted intrinsic ratios deterministically', () => {
    expect(parseGallerySourceRatio('1.7777778')).toBeCloseTo(1.7777778);
    expect(parseGallerySourceRatio('0')).toBeNull();
    expect(normalizeGallerySourceRatio(undefined)).toBe(1);
    expect(formatGallerySourceRatio(1.7777778)).toBe('1.777778');
    expect(gallerySourceRatioPatch(1.5)).toEqual({ '--field-gallery-source-ratio': '1.5' });
    expect(gallerySourceAspectRatio(1.5)).toBe('1.5 / 1');
  });

  it('fits source-ratio carousel frames inside the composed 720px media height', () => {
    expect(galleryCarouselSourceImageWidth(0.5)).toBe('min(360px, calc(100% - 32px))');
    expect(galleryCarouselSourceImageWidth(1)).toBe('min(720px, calc(100% - 32px))');
    expect(galleryCarouselSourceImageWidth(2)).toBe('min(720px, calc(100% - 32px))');
  });
});
