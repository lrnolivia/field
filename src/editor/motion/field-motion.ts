import { useReducedMotion, type Transition, type Variants } from 'motion/react';

/**
 * field.MOTION
 *
 * Semantic editor-feedback motion. These values describe interaction meaning,
 * not arbitrary component durations. Editor feedback is ephemeral UI state:
 * it must never serialize into the design graph, generated source, Preview
 * semantics, or the production website.
 */
export const fieldMotion = {
  response: { type: 'spring', stiffness: 720, damping: 38, mass: 0.34 } satisfies Transition,
  glyph: { type: 'spring', stiffness: 620, damping: 30, mass: 0.38 } satisfies Transition,
  toggle: { type: 'spring', stiffness: 520, damping: 32, mass: 0.55 } satisfies Transition,
  disclosure: { type: 'spring', stiffness: 470, damping: 32, mass: 0.56 } satisfies Transition,
  spatial: { type: 'spring', stiffness: 410, damping: 34, mass: 0.68 } satisfies Transition,
  expressive: { type: 'spring', stiffness: 360, damping: 26, mass: 0.72 } satisfies Transition,
  buttonTapScale: 0.985,
  actionTapScale: 0.99,
  swatchHoverScale: 1.045,
  swatchTapScale: 0.975,
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
  hover: { rotate: 8, scale: 1.07 },
  tap: { rotate: -3, scale: 0.88 },
};

export const removeGlyphVariants: Variants = {
  rest: { scaleX: 1, scaleY: 1, x: 0 },
  hover: { scaleX: 0.88, scaleY: 1, x: -0.25 },
  tap: { scaleX: 0.76, scaleY: 0.92, x: 0 },
};

export const plusGlyphVariants: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: 7, scale: 1.07 },
  tap: { rotate: -2, scale: 0.86 },
};

export const minusGlyphVariants: Variants = {
  rest: { scaleX: 1, scaleY: 1 },
  hover: { scaleX: 0.86, scaleY: 1 },
  tap: { scaleX: 0.72, scaleY: 0.9 },
};

export const swatchVariants: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -1, scale: fieldMotion.swatchHoverScale },
  tap: { y: 0, scale: fieldMotion.swatchTapScale },
};
