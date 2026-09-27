import { useReducedMotion, type Transition, type Variants } from 'motion/react';

/**
 * field.MOTION
 *
 * Semantic editor-feedback motion. These values describe interaction meaning,
 * not arbitrary component durations. Editor feedback is ephemeral UI state:
 * it must never serialize into the design graph, generated source, Preview
 * semantics, or the production website.
 * Spatial feedback belongs on local affordance parts; hit-target geometry stays fixed.
 */
export const fieldMotion = {
  response: { type: 'spring', stiffness: 560, damping: 26, mass: 0.42 } satisfies Transition,
  glyph: { type: 'spring', stiffness: 500, damping: 22, mass: 0.44 } satisfies Transition,
  toggle: { type: 'spring', stiffness: 430, damping: 22, mass: 0.62 } satisfies Transition,
  disclosure: { type: 'spring', stiffness: 420, damping: 23, mass: 0.6 } satisfies Transition,
  spatial: { type: 'spring', stiffness: 360, damping: 25, mass: 0.72 } satisfies Transition,
  expressive: { type: 'spring', stiffness: 330, damping: 21, mass: 0.78 } satisfies Transition,
  buttonHoverScale: 1.02,
  buttonHoverY: -1.25,
  buttonTapScale: 0.955,
  actionTapScale: 0.97,
  swatchHoverScale: 1.1,
  swatchTapScale: 0.92,
} as const;

export function useFieldReducedMotion(): boolean {
  return Boolean(useReducedMotion());
}

export function fieldSpatialTransition(
  reducedMotion: boolean,
  transition: Transition = fieldMotion.response,
): Transition {
  return reducedMotion ? { duration: 0 } : transition;
}

export const addGlyphVariants: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: 16, scale: 1.18 },
  tap: { rotate: -7, scale: 0.78 },
};

export const removeGlyphVariants: Variants = {
  rest: { scaleX: 1, scaleY: 1, x: 0 },
  hover: { scaleX: 0.72, scaleY: 1, x: -1.25 },
  tap: { scaleX: 0.56, scaleY: 0.86, x: 0 },
};

export const plusGlyphVariants: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: 14, scale: 1.16 },
  tap: { rotate: -6, scale: 0.78 },
};

export const minusGlyphVariants: Variants = {
  rest: { scaleX: 1, scaleY: 1 },
  hover: { scaleX: 0.7, scaleY: 1 },
  tap: { scaleX: 0.54, scaleY: 0.84 },
};

export const swatchVariants: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -2, scale: fieldMotion.swatchHoverScale },
  tap: { y: 0.75, scale: fieldMotion.swatchTapScale },
};

export const buttonContentVariants: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { y: fieldMotion.buttonHoverY, scale: fieldMotion.buttonHoverScale },
  tap: { y: 0.75, scale: fieldMotion.buttonTapScale },
};
