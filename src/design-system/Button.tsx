// Button.tsx — Centralized button component with variant and size props.
// Replaces scattered button class patterns across the builder.
// Uses CSS variables for theming consistency.

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = HTMLMotionProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-[30px] px-2 text-xs',
  md: 'h-8 px-3 text-xs',
  lg: 'h-10 px-4 text-sm',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110',
  secondary: 'bg-[var(--button-secondary-bg,rgba(255,255,255,0.06))] text-[var(--text-secondary)] hover:brightness-125',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}, ref) {
  const reducedMotion = useFieldReducedMotion();
  const blocked = Boolean(disabled || loading);

  return (
    <motion.button
      ref={ref}
      disabled={blocked}
      whileTap={!blocked && !reducedMotion ? { scale: fieldMotion.buttonTapScale } : undefined}
      transition={fieldSpatialTransition(reducedMotion, fieldMotion.response)}
      data-field-motion="button-press"
      className={`
        inline-flex items-center justify-center gap-1.5 font-medium
        cut-corners transition-colors cursor-pointer border-none select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${SIZE_CLASSES[size]}
        ${VARIANT_CLASSES[variant]}
        ${className}
      `.trim()}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      ) : icon}
      {children}
    </motion.button>
  );
});

Button.displayName = 'Button';
export default Button;
