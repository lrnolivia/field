import { describe, expect, it } from 'vitest';
import { GRADIENT_TEXT_COMPONENT } from './GradientText';

describe('GradientText paint host', () => {
  it('keeps layout/box styles on the component root and mirrors text paint to visible glyphs', () => {
    expect(GRADIENT_TEXT_COMPONENT).toContain('const rootStyle = props.style || {}');
    expect(GRADIENT_TEXT_COMPONENT).toContain('...rootStyle');
    expect(GRADIENT_TEXT_COMPONENT).toContain('data-gradient-text-glyph');
    expect(GRADIENT_TEXT_COMPONENT).toContain('textShadow: rootStyle.textShadow');
    expect(GRADIENT_TEXT_COMPONENT).toContain('WebkitTextStroke: rootStyle.WebkitTextStroke');
    expect(GRADIENT_TEXT_COMPONENT).toContain('...glyphPaintStyle');
  });

  it('keeps the travelling gradient on the glyph host instead of moving it to the wrapper', () => {
    expect(GRADIENT_TEXT_COMPONENT).toContain('el.style.backgroundImage = ramp');
    expect(GRADIENT_TEXT_COMPONENT).toContain("WebkitBackgroundClip: 'text'");
    expect(GRADIENT_TEXT_COMPONENT).toContain("WebkitTextFillColor: 'transparent'");
    expect(GRADIENT_TEXT_COMPONENT).toContain('useStaticCanvas()');
  });
});
