// RemoveButton — small inline minus action for removing authored entries.

import React from 'react';
import { motion } from 'motion/react';
import { useFieldReducedMotion } from '@/editor/motion';
import { FieldGlyph } from '@/editor/glyph';

export function RemoveButton({
  onClick,
  label = 'Remove',
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label?: string;
}) {
  const reducedMotion = useFieldReducedMotion();

  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      initial="rest"
      whileHover={!reducedMotion ? 'hover' : undefined}
      whileTap={!reducedMotion ? 'tap' : undefined}
      data-field-motion="remove"
      className="relative w-4 h-4 inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ml-1 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--selection)] after:absolute after:-inset-1 after:content-['']"
    >
      <FieldGlyph behavior="minus">
        <svg data-field-motion-part="glyph" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
          <path d="M2.25 6h7.5" />
        </svg>
      </FieldGlyph>
    </motion.button>
  );
}
