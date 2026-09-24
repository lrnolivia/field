// loew-glyphs.tsx — Minimal UI: native-glyph icon primitive.
//
// OURS (not upstream). Renders a plain Unicode character in the system UI font
// so simple universal actions (add, refresh, …) feel native instead of
// custom-drawn. It is a drop-in for an SVG icon: callers keep passing
// `className="w-4 h-4"` / `style={{ color }}`; the glyph fills that box and
// takes its colour from `currentColor`.
//
// The two-span structure exists because the glyph must scale with the BOX, not
// with the inherited text size: the outer span is a size container, the inner
// span sizes its font in `cqmin` units of that container. (Styles for
// `.loew-glyph` live in loew-theme.css.)
//
// No SF Symbols or other proprietary assets — only characters the OS already has.

import React from 'react';

export interface GlyphIconProps {
  /** The character to draw, e.g. '+' or '↻'. */
  glyph: string;
  className?: string;
  style?: React.CSSProperties;
  /** Glyph size as a fraction of the icon box (default 0.9). */
  scale?: number;
  /** CSS font-weight for the glyph (default 500). */
  weight?: number;
}

export const GlyphIcon: React.FC<GlyphIconProps> = ({
  glyph,
  className,
  style,
  scale = 0.9,
  weight = 500,
}) => (
  <span aria-hidden="true" className={`loew-glyph${className ? ` ${className}` : ''}`} style={style}>
    <span className="loew-glyph__char" style={{ fontSize: `${scale * 100}cqmin`, fontWeight: weight }}>
      {glyph}
    </span>
  </span>
);
