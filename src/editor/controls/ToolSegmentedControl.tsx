// ToolSegmentedControl.tsx — Compact segmented choice control.
// Shares field's chrome-tab visual language: inset accent, glyph-aware,
// no detached/sliding highlight slab.

import { useRef, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { FieldGlyph } from '@/editor/glyph';
import { trace } from '@/shared/debug-trace';

interface Option {
  value: string;
  label?: string;
  icon?: React.ReactNode;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  size?: 'sm' | 'md' | 'compact';
}

export default function ToolSegmentedControl({ value, onChange, options, size = 'md' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    if (options.length < 2) return;
    event.preventDefault();
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    containerRef.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  };

  const height = size === 'compact' ? 'h-7' : 'h-8';
  const padding = size === 'compact' ? 'px-1.5' : 'px-2.5';
  const text = size === 'compact' ? 'text-[10px]' : 'text-[11px]';

  return (
    <div
      ref={containerRef}
      role="group"
      data-tool-segmented
      className="relative flex w-full items-center gap-0.5 rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-hover)]/32 p-0.5"
    >
      {options.map((opt, index) => {
        const active = value === opt.value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            aria-pressed={active}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            onClick={() => {
              trace.action('tool-segmented:change', { from: value, to: opt.value });
              onChange(opt.value);
            }}
            onKeyDown={(event) => moveFocus(event, index)}
            className={`relative z-10 flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[6px] border border-transparent font-medium transition-[background-color,color,border-color,box-shadow] ${height} ${padding} ${text} ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]/70 hover:text-[var(--text-primary)]'}`}
            style={active ? {
              background: 'var(--accent-surface)',
              borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-light))',
              boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
            } : undefined}
          >
            {opt.icon && (
              <span
                aria-hidden
                className="flex h-4 w-4 shrink-0 items-center justify-center"
                style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
              >
                <FieldGlyph behavior="generic">{opt.icon}</FieldGlyph>
              </span>
            )}
            {opt.label && <span className="truncate">{opt.label}</span>}
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-2.5 bottom-[2px] h-[2px] rounded-full bg-[var(--accent)] opacity-70"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
