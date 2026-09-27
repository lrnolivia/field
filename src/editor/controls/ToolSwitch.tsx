// ToolSwitch.tsx — Toggle switch (on/off).

import { motion } from 'motion/react';
import { trace } from '@/shared/debug-trace';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export default function ToolSwitch({ value, onChange, disabled }: Props) {
  const reducedMotion = useFieldReducedMotion();

  return (
    <button
      type="button"
      aria-pressed={value}
      data-field-motion="switch"
      onClick={() => { if (!disabled) { trace.action('tool-switch:toggle', { from: value, to: !value }); onChange(!value); } }}
      disabled={disabled}
      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${value ? 'bg-[var(--accent)]' : 'bg-[var(--control-border)]'}`}
    >
      <motion.span
        data-field-motion-part="thumb"
        className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0"
        animate={{ x: value ? 20 : 0 }}
        transition={fieldSpatialTransition(reducedMotion, fieldMotion.toggle)}
      />
    </button>
  );
}
