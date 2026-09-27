import type { ReactNode } from 'react';
import { motion, type Variants } from 'motion/react';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';

export type FieldGlyphBehavior =
  | 'generic'
  | 'plus'
  | 'minus'
  | 'chevron'
  | 'eye'
  | 'lock'
  | 'pin'
  | 'delete'
  | 'ellipsis'
  | 'copy'
  | 'gear'
  | 'align-left'
  | 'align-center-h'
  | 'align-right'
  | 'align-top'
  | 'align-center-v'
  | 'align-bottom';

const rest = { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1 };

export const fieldGlyphVariants: Record<FieldGlyphBehavior, Variants> = {
  generic: { rest, hover: { y: -1, scale: 1.08 }, tap: { y: 0.5, scale: 0.82 } },
  plus: { rest, hover: { rotate: 16, scale: 1.18 }, tap: { rotate: -7, scale: 0.78 } },
  minus: { rest, hover: { scaleX: 0.7, scaleY: 1, x: -0.6 }, tap: { scaleX: 0.54, scaleY: 0.84, x: 0 } },
  chevron: { rest, hover: { x: 1.5, scale: 1.08 }, tap: { x: 0.5, scale: 0.84 } },
  eye: { rest, hover: { scaleX: 1.04, scaleY: 0.78 }, tap: { scaleX: 0.9, scaleY: 0.62 } },
  lock: { rest, hover: { y: -1, scale: 1.08 }, tap: { y: 0.75, scale: 0.82 } },
  pin: { rest, hover: { y: 1, scale: 0.96 }, tap: { y: 1.5, scale: 0.82 } },
  delete: { rest, hover: { y: -1, rotate: -6, scale: 1.08 }, tap: { y: 0.5, rotate: 3, scale: 0.8 } },
  ellipsis: { rest, hover: { scaleX: 1.16, scaleY: 1.08 }, tap: { scaleX: 0.78, scaleY: 0.88 } },
  copy: { rest, hover: { x: 1.25, y: -1, scale: 1.05 }, tap: { x: 0.5, y: 0.5, scale: 0.82 } },
  gear: { rest, hover: { rotate: 18, scale: 1.06 }, tap: { rotate: -8, scale: 0.82 } },
  'align-left': { rest, hover: { x: -2, scale: 1.05 }, tap: { x: -0.75, scale: 0.84 } },
  'align-center-h': { rest, hover: { scaleX: 0.9, scaleY: 1.08 }, tap: { scaleX: 0.78, scaleY: 0.86 } },
  'align-right': { rest, hover: { x: 2, scale: 1.05 }, tap: { x: 0.75, scale: 0.84 } },
  'align-top': { rest, hover: { y: -2, scale: 1.05 }, tap: { y: -0.75, scale: 0.84 } },
  'align-center-v': { rest, hover: { scaleX: 1.08, scaleY: 0.9 }, tap: { scaleX: 0.86, scaleY: 0.78 } },
  'align-bottom': { rest, hover: { y: 2, scale: 1.05 }, tap: { y: 0.75, scale: 0.84 } },
};

export function FieldGlyph({ behavior = 'generic', children, className = '' }: { behavior?: FieldGlyphBehavior; children: ReactNode; className?: string }) {
  const reducedMotion = useFieldReducedMotion();
  return (
    <motion.span
      data-field-glyph={behavior}
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      variants={reducedMotion ? undefined : fieldGlyphVariants[behavior]}
      transition={fieldSpatialTransition(reducedMotion, fieldMotion.glyph)}
    >
      {children}
    </motion.span>
  );
}
