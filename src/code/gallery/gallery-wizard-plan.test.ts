import { describe, expect, it } from 'vitest';
import {
  GALLERY_FRAME_SIZING_STYLE_PROPERTY,
  GALLERY_SOURCE_RATIO_STYLE_PROPERTY,
} from './gallery-frame-sizing';
import { GALLERY_NATURAL_SEED_STYLE_PROPERTY } from './gallery-views';
import { buildGalleryWizardSourcePlan } from './gallery-wizard-plan';

function imageOf(plan: ReturnType<typeof buildGalleryWizardSourcePlan>, index = 0) {
  return plan.itemNodes[index]?.children?.find((child) => child.type.replace(/^motion\./, '') === 'img');
}

describe('Gallery wizard source plan', () => {
  it('builds one canonical source-backed Gallery in chosen media order', () => {
    const plan = buildGalleryWizardSourcePlan({
      mediaUrls: ['/b.jpg', '/a.jpg'],
      view: 'grid',
      frameSizing: 'composed',
      fit: 'contain',
      naturalSeed: 5,
      ariaLabel: 'Portfolio',
    });

    expect(plan.rootPatch[GALLERY_FRAME_SIZING_STYLE_PROPERTY]).toBe('composed');
    expect(plan.rootPatch[GALLERY_NATURAL_SEED_STYLE_PROPERTY]).toBe('0');
    expect(plan.rootPatch.minHeight).toBe('');
    expect(plan.rootAttrs['aria-label']).toBe('Portfolio');
    expect(plan.itemNodes.map((item) => item.children?.[0]?.attrs?.src)).toEqual(['/b.jpg', '/a.jpg']);
    expect(imageOf(plan)?.styles?.objectFit).toBe('contain');
    expect(plan.carousel).toBe(false);
  });

  it('persists Source-ratio Natural geometry and deterministic composition state', () => {
    const plan = buildGalleryWizardSourcePlan({
      mediaUrls: ['/wide.jpg', '/portrait.jpg'],
      view: 'natural',
      frameSizing: 'source',
      fit: 'cover',
      naturalSeed: 7,
      sourceRatios: [1.5, 0.75],
    });

    expect(plan.naturalSeed).toBe(1);
    expect(plan.rootPatch[GALLERY_NATURAL_SEED_STYLE_PROPERTY]).toBe('1');
    expect(plan.itemNodes[0]?.styles?.[GALLERY_SOURCE_RATIO_STYLE_PROPERTY]).toBe('1.5');
    expect(plan.itemNodes[1]?.styles?.[GALLERY_SOURCE_RATIO_STYLE_PROPERTY]).toBe('0.75');
    expect(imageOf(plan, 1)?.styles?.objectFit).toBe('cover');
  });

  it('keeps Strip hover behavior and Carousel semantics mode-specific', () => {
    const strip = buildGalleryWizardSourcePlan({
      mediaUrls: ['/a.jpg'],
      view: 'strip',
      frameSizing: 'source',
      fit: 'cover',
      naturalSeed: 0,
      sourceRatios: [2],
    });
    expect(strip.stripHoverPatch).toEqual({
      width: '',
      minWidth: 'min(380px, calc(100vw - 32px))',
    });

    const carousel = buildGalleryWizardSourcePlan({
      mediaUrls: ['/a.jpg'],
      view: 'carousel',
      frameSizing: 'composed',
      fit: 'contain',
      naturalSeed: 0,
    });
    expect(carousel.carousel).toBe(true);
    expect(carousel.rootAttrs['aria-roledescription']).toBe('carousel');
    expect(imageOf(carousel)?.styles?.objectFit).toBe('contain');
  });

  it('rejects incomplete Source-ratio and empty-media plans', () => {
    expect(() => buildGalleryWizardSourcePlan({
      mediaUrls: [],
      view: 'grid',
      frameSizing: 'composed',
      fit: 'cover',
      naturalSeed: 0,
    })).toThrow('at least one media item');

    expect(() => buildGalleryWizardSourcePlan({
      mediaUrls: ['/a.jpg'],
      view: 'story',
      frameSizing: 'source',
      fit: 'cover',
      naturalSeed: 0,
      sourceRatios: [null],
    })).toThrow('requires intrinsic media ratios');
  });
});
