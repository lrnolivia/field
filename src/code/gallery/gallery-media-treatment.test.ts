import { describe, expect, it } from 'vitest';
import {
  GALLERY_IMAGE_ROTATION_STYLE_PROPERTY,
  GALLERY_IMAGE_TRANSFORM_VALUE,
  GALLERY_IMAGE_ZOOM_STYLE_PROPERTY,
  clampGalleryZoom,
  galleryMediaTreatmentPatch,
  normalizeGalleryRotation,
  parseGalleryRotation,
  parseGalleryZoom,
} from './gallery-media-treatment';

describe('Gallery media treatment', () => {
  it('clamps zoom and normalizes authored rotation deterministically', () => {
    expect(clampGalleryZoom(0.2)).toBe(1);
    expect(clampGalleryZoom(2.375)).toBe(2.375);
    expect(clampGalleryZoom(9)).toBe(4);
    expect(normalizeGalleryRotation(390)).toBe(30);
    expect(normalizeGalleryRotation(-195)).toBe(165);
    expect(parseGalleryZoom('1.75')).toBe(1.75);
    expect(parseGalleryRotation('-22.5deg')).toBe(-22.5);
  });

  it('serializes focal, zoom, and rotation as one source-backed image treatment', () => {
    expect(galleryMediaTreatmentPatch('23% 71%', 1.5, 15)).toEqual({
      objectPosition: '23% 71%',
      transformOrigin: '23% 71%',
      [GALLERY_IMAGE_ZOOM_STYLE_PROPERTY]: '1.5',
      [GALLERY_IMAGE_ROTATION_STYLE_PROPERTY]: '15deg',
      transform: GALLERY_IMAGE_TRANSFORM_VALUE,
    });
  });
});
