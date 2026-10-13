import { describe, expect, it } from 'vitest';
import { fieldGlyphVariants } from './field-glyph';
import { glyphIcons } from './icon-data';

describe('field.GLYPH contracts', () => {
  it('keeps every reactive behavior transform-only', () => {
    for (const variants of Object.values(fieldGlyphVariants)) {
      for (const state of Object.values(variants)) {
        if (!state || typeof state !== 'object') continue;
        for (const key of Object.keys(state)) {
          expect(['x', 'y', 'rotate', 'scale', 'scaleX', 'scaleY']).toContain(key);
        }
      }
    }
  });

  it('ships canonical state-morph pairs', () => {
    expect(glyphIcons.chevronRight.length).toBeGreaterThan(0);
    expect(glyphIcons.chevronDown.length).toBeGreaterThan(0);
    expect(glyphIcons.eye.length).toBeGreaterThan(0);
    expect(glyphIcons.eyeOff.length).toBeGreaterThan(0);
    expect(glyphIcons.lock.length).toBeGreaterThan(0);
    expect(glyphIcons.unlock.length).toBeGreaterThan(0);
    expect(glyphIcons.ellipsis.length).toBeGreaterThan(0);
    expect(glyphIcons.close.length).toBeGreaterThan(0);
  });
});
