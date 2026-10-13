// ToolButton.tsx — Standard toolbar button.

import { motion } from 'motion/react';
import { buttonContentVariants, fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';

interface Props {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
}

export default function ToolButton({ children, onClick, disabled, className }: Props) {
  const reducedMotion = useFieldReducedMotion();
  const uiCase = useUiChromeCase();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial="rest"
      whileHover={!disabled && !reducedMotion ? 'hover' : undefined}
      whileTap={!disabled && !reducedMotion ? 'tap' : undefined}
      transition={fieldSpatialTransition(reducedMotion, fieldMotion.response)}
      data-field-motion="tool-button-press"
      className={`h-[var(--control-height-sm)] w-full flex items-center justify-center text-xs bg-[var(--grid-line)] border border-[var(--control-border)] [--cut-border-color:var(--control-border)] hover:border-[var(--control-border-hover)] focus-visible:border-[var(--border-focus)] text-[var(--text-primary)] cut-corners cut-border hover:[--cut-border-color:var(--control-border-hover)] focus-visible:[--cut-border-color:var(--border-focus)] focus-visible:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
    >
      <motion.span
        className="inline-flex min-w-0 items-center justify-center"
        variants={buttonContentVariants}
        transition={fieldSpatialTransition(reducedMotion, fieldMotion.response)}
      >
        {typeof children === 'string' ? uiCase(children) : children}
      </motion.span>
    </motion.button>
  );
}
