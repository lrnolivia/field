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

  it('keeps routine press and hover geometry restrained', () => {
    expect(fieldMotion.buttonTapScale).toBeGreaterThanOrEqual(0.98);
    expect(fieldMotion.actionTapScale).toBeGreaterThanOrEqual(0.98);
    expect(fieldMotion.swatchHoverScale).toBeLessThanOrEqual(1.05);
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
