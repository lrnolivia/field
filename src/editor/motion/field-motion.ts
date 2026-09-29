import { useReducedMotion, type Transition, type Variants } from 'motion/react';

export type FieldMotionAxis = 'horizontal' | 'vertical';
export type FieldMotionDiagnosis =
  | 'perceptual-judder'
  | 'main-thread-jank'
  | 'paint-filter-cost'
  | 'geometric-discontinuity'
  | 'reduced-motion-mismatch';

export const fieldStructuralSpringPhysics = Object.freeze({
  stiffness: 520,
  damping: 42.3,
  mass: 0.86,
});

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
  structural: { type: 'spring', ...fieldStructuralSpringPhysics } satisfies Transition,
  morph: { type: 'spring', ...fieldStructuralSpringPhysics } satisfies Transition,
  utilityOpacity: { duration: 0.12, ease: [0.2, 0.8, 0.2, 1] } satisfies Transition,
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

export function prefersFieldReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function fieldMotionBlurFilter(
  axis: FieldMotionAxis,
  reducedMotion = false,
): string {
  return reducedMotion ? 'none' : 'url(#field-motion-blur-' + axis + ')';
}

export function createFieldRafCoalescer<T>(apply: (value: T) => void) {
  let frame = 0;
  let latest: T | undefined;

  const applyLatest = () => {
    frame = 0;
    if (latest === undefined) return;
    const value = latest;
    latest = undefined;
    apply(value);
  };

  return {
    schedule(value: T) {
      latest = value;
      if (!frame) frame = requestAnimationFrame(applyLatest);
    },
    flush() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      applyLatest();
    },
    cancel() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      latest = undefined;
    },
  };
}

export function fieldSpatialTransition(
  reducedMotion: boolean,
  transition: Transition = fieldMotion.response,
): Transition {
  return reducedMotion ? { duration: 0 } : transition;
}

export const addGlyphVariants: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: 0, scale: 1.12 },
  tap: { rotate: 0, scale: 0.82 },
};

export const removeGlyphVariants: Variants = {
  rest: { scaleX: 1, scaleY: 1, x: 0 },
  hover: { scaleX: 0.72, scaleY: 1, x: -1.25 },
  tap: { scaleX: 0.56, scaleY: 0.86, x: 0 },
};

export const plusGlyphVariants: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: 0, scale: 1.12 },
  tap: { rotate: 0, scale: 0.82 },
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
