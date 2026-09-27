// AddButton.tsx — Small "+" icon button for section headers.
// FIGUI3_SIDEBAR_ADD_ACTION_20260925
// Used in: Pages +, Components +, Presets +, etc.

import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { motion } from 'motion/react';
import {
  addGlyphVariants,
  fieldMotion,
  fieldSpatialTransition,
  useFieldReducedMotion,
} from '@/editor/motion';

type AddButtonProps = ComponentPropsWithoutRef<typeof motion.button>;

const AddButton = forwardRef<HTMLButtonElement, AddButtonProps>(
  function AddButton({ className = '', disabled, ...props }, ref) {
    const reducedMotion = useFieldReducedMotion();
    const interactive = !disabled && !reducedMotion;

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        initial="rest"
        whileHover={interactive ? 'hover' : undefined}
        whileTap={interactive ? 'tap' : undefined}
        data-field-motion="add"
        className={`w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[var(--bg-hover)] text-[var(--text-disabled)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        <motion.svg
          data-field-motion-part="glyph"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          variants={addGlyphVariants}
          transition={fieldSpatialTransition(reducedMotion, fieldMotion.glyph)}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </motion.svg>
      </motion.button>
    );
  },
);

AddButton.displayName = 'AddButton';
export default AddButton;
