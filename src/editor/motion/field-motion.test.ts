import { describe, expect, it } from 'vitest';
import {
  addGlyphVariants,
  fieldMotion,
  fieldSpatialTransition,
  minusGlyphVariants,
  plusGlyphVariants,
  removeGlyphVariants,
  swatchVariants,
} from './field-motion';

describe('field.MOTION semantic contract', () => {
  it('uses true springs for spatial interaction families', () => {
    expect(fieldMotion.response.type).toBe('spring');
    expect(fieldMotion.glyph.type).toBe('spring');
    expect(fieldMotion.toggle.type).toBe('spring');
    expect(fieldMotion.disclosure.type).toBe('spring');
    expect(fieldMotion.spatial.type).toBe('spring');
    expect(fieldMotion.expressive.type).toBe('spring');
  });

  it('keeps routine feedback visible without becoming theatrical', () => {
    // Human Preview QA rejected the original ~1–2% transforms as perceptually invisible.
    // Preserve a meaningful response floor while keeping outer hit targets/layout stable.
    expect(fieldMotion.buttonTapScale).toBeLessThanOrEqual(0.96);
    expect(fieldMotion.buttonTapScale).toBeGreaterThanOrEqual(0.94);
    expect(fieldMotion.actionTapScale).toBeLessThanOrEqual(0.98);
    expect(fieldMotion.swatchHoverScale).toBeGreaterThanOrEqual(1.08);
    expect(fieldMotion.swatchHoverScale).toBeLessThanOrEqual(1.12);
  });

  it('snaps spatial travel under reduced motion instead of removing state feedback', () => {
    expect(fieldSpatialTransition(true, fieldMotion.expressive)).toEqual({ duration: 0 });
  });

  it('defines local affordance variants rather than row choreography', () => {
    expect(addGlyphVariants).toHaveProperty('hover');
    expect(removeGlyphVariants).toHaveProperty('hover');
    expect(plusGlyphVariants).toHaveProperty('hover');
    expect(minusGlyphVariants).toHaveProperty('hover');
    expect(swatchVariants).toHaveProperty('hover');
  });
});
