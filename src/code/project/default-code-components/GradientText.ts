// GradientText — Code component template (animated gradient clipped to text).
//
// The gradient is painted as a background image on the text span and clipped
// to the glyph shapes via `background-clip: text` with a transparent fill.
// Motion comes from sliding `background-position` across a background sized
// wider than the box, so the colour ramp travels through the letterforms.
//
// Driven by a compositor-friendly CSS background-position animation so
// Design and Preview show the same travelling highlight.

export const GRADIENT_TEXT_COMPONENT = `'use client';

/** @label "Gradient Text" */
/** @comment "Text filled with a travelling multi-colour gradient." */
/** @defaultWidth 600 */
/** @defaultHeight 200 */
/** @controls {
  "text": { "type": "text", "label": "Text", "default": "Gradient" },
  "colorA": { "type": "color", "label": "Color 1", "default": "#a855f7" },
  "colorB": { "type": "color", "label": "Color 2", "default": "#38bdf8" },
  "colorC": { "type": "color", "label": "Color 3", "default": "#f472b6" },
  "angle": { "type": "number", "label": "Angle", "min": 0, "max": 360, "step": 5, "default": 90, "unit": "deg" },
  "speed": { "type": "number", "label": "Speed", "min": 0, "max": 4, "step": 0.1, "default": 1 },
  "spread": { "type": "number", "label": "Spread", "min": 120, "max": 500, "step": 10, "default": 240, "unit": "%" }
} */

import { withResponsiveProps } from '@revyme/runtime';

function GradientText({
  text = 'Gradient',
  colorA = '#a855f7',
  colorB = '#38bdf8',
  colorC = '#f472b6',
  angle = 90,
  speed = 1,
  spread = 240,
  ...props
}) {
  const ramp =
    'linear-gradient(' + angle + 'deg, ' +
    colorA + ' 0%, ' + colorB + ' 25%, ' + colorC + ' 50%, ' +
    colorB + ' 75%, ' + colorA + ' 100%)';
  const duration = 6 / Math.max(0.05, speed || 0.05);
  const rootStyle = props.style || {};

  return (
    <div
      data-id={props['data-id']}
      data-name={props['data-name']}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...props.style,
      }}
    >
      <span
        style={{
          lineHeight: 1.15,
          backgroundImage: ramp,
          backgroundSize: spread + '% 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: speed > 0 ? '0% 50%' : '35% 50%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          whiteSpace: 'pre-wrap',
          textShadow: rootStyle.textShadow,
          WebkitTextStroke: rootStyle.WebkitTextStroke || rootStyle.webkitTextStroke,
          animation: speed > 0 ? 'field-gradient-text-shimmer ' + duration + 's linear infinite' : undefined,
        }}
      >
        {text}
      </span>
      <style>{'@keyframes field-gradient-text-shimmer { from { background-position: 0% 50%; } to { background-position: 100% 50%; } }'}</style>
    </div>
  );
}

export default withResponsiveProps(GradientText);
`;
