// ToolPlusMinus.tsx — Plus/minus stepper buttons.

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { trace } from '@/shared/debug-trace';
import { useFieldReducedMotion } from '@/editor/motion';
import { FieldGlyph } from '@/editor/glyph';
import { takeVerticalWheelSteps } from './vertical-wheel';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function ToolPlusMinus({ value, onChange, min = 0, max = 10000, step = 1 }: Props) {
  const reducedMotion = useFieldReducedMotion();
  const hoverState = reducedMotion ? undefined : 'hover';
  const tapState = reducedMotion ? undefined : 'tap';
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wheelDeltaRef = useRef(0);
  const wheelValueRef = useRef(value);

  useEffect(() => {
    wheelValueRef.current = value;
  }, [value]);

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const result = takeVerticalWheelSteps(wheelDeltaRef.current, event.deltaY, event.deltaMode);
    wheelDeltaRef.current = result.remainder;
    if (result.steps === 0) return;
    const from = wheelValueRef.current;
    const next = Math.max(min, Math.min(max, from - result.steps * step));
    wheelValueRef.current = next;
    trace.action('tool-plus-minus:wheel-step', { from, to: next, steps: result.steps });
    onChange(next);
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const onWheel = (event: WheelEvent) => handleWheel(event);
    wrapper.addEventListener('wheel', onWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', onWheel);
  });

  return (
    <div
      ref={wrapperRef}
      data-field-no-canvas-input
      data-value-wheel="vertical"
      className="flex w-full items-center border border-[var(--control-border)] [--cut-border-color:var(--control-border)] cut-corners cut-border overflow-hidden cursor-ns-resize"
    >
      <motion.button
        type="button"
        aria-label="Decrease value"
        initial="rest"
        whileHover={hoverState}
        whileTap={tapState}
        data-field-motion="stepper-minus"
        onClick={() => { const v = Math.max(min, value - step); trace.action('tool-plus-minus:decrement', { from: value, to: v }); onChange(v); }}
        className="flex-1 flex items-center justify-center h-[var(--control-height-sm)] transition-colors bg-[var(--choice-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--control-bg-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--selection)]"
      >
        <FieldGlyph behavior="minus">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </FieldGlyph>
      </motion.button>
      <motion.button
        type="button"
        aria-label="Increase value"
        initial="rest"
        whileHover={hoverState}
        whileTap={tapState}
        data-field-motion="stepper-plus"
        onClick={() => { const v = Math.min(max, value + step); trace.action('tool-plus-minus:increment', { from: value, to: v }); onChange(v); }}
        className="flex-1 flex items-center justify-center h-[var(--control-height-sm)] transition-colors bg-[var(--choice-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--control-bg-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--selection)]"
      >
        <FieldGlyph behavior="plus">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </FieldGlyph>
      </motion.button>
    </div>
  );
}
