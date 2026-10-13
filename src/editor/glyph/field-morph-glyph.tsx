import { motion } from 'motion/react';
import { MorphIcon, type IconInput, type SpringPreset } from 'morphicons/react';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';

export function FieldMorphGlyph({
  active, from, to, size = 16, strokeWidth = 1.5, color = 'currentColor', spring = 'bouncy', turn = 0, className = '',
}: {
  active: boolean;
  from: IconInput;
  to: IconInput;
  size?: number;
  strokeWidth?: number;
  color?: string;
  spring?: SpringPreset;
  turn?: number;
  className?: string;
}) {
  const reducedMotion = useFieldReducedMotion();
  return (
    <motion.span
      data-field-glyph-morph={active ? 'to' : 'from'}
      aria-hidden="true"
      initial={false}
      animate={reducedMotion ? { rotate: 0 } : { rotate: active ? turn : 0 }}
      transition={fieldSpatialTransition(reducedMotion, fieldMotion.glyph)}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <MorphIcon
        icon={active ? to : from}
        spring={spring}
        reducedMotion="user"
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        aria-hidden="true"
      />
    </motion.span>
  );
}
