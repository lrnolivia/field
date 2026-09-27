// RemoveButton — small inline minus action for removing authored entries.

import React from 'react';
import { motion } from 'motion/react';
import {
  fieldMotion,
  fieldSpatialTransition,
  removeGlyphVariants,
  useFieldReducedMotion,
} from '@/editor/motion';

export function RemoveButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  const reducedMotion = useFieldReducedMotion();

  return (
    <motion.span
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      initial="rest"
      whileHover={!reducedMotion ? 'hover' : undefined}
      whileTap={!reducedMotion ? 'tap' : undefined}
      data-field-motion="remove"
      className="w-4 h-4 inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ml-1 shrink-0"
    >
      <motion.svg
        data-field-motion-part="glyph"
        aria-hidden
        width="11"
        height="11"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        variants={removeGlyphVariants}
        transition={fieldSpatialTransition(reducedMotion, fieldMotion.glyph)}
      >
        <path d="M2.25 6h7.5" />
      </motion.svg>
    </motion.span>
  );
}
