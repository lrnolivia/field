// ControlActionRow — reusable popup row button with consistent styling.
// Replaces 17+ duplicated className strings across tool panels.

import React from 'react';
import { motion } from 'motion/react';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';

interface ControlActionRowProps {
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  /** An independent action at the end of the same field. */
  trailingAction?: React.ReactNode;
  /** Use centered h-8 px-3 text-center variant (e.g. TextStyleTool rows) */
  center?: boolean;
  /** Render inside a compound Inspector field (PaintRow owns the shell/border). */
  embedded?: boolean;
  /** Extra Tailwind classes (e.g. 'justify-between') */
  className?: string;
  /** Pass-through for any data-* attributes (e.g. data-scroll-transform-entry) */
  [key: `data-${string}`]: string | undefined;
}

const BASE =
  // `min-w-0` is REQUIRED: this is a flex item AND a <button>, whose automatic min-width is its full content
  // (its `truncate` text has white-space:nowrap → min-content = the whole label). Without min-w-0 the button
  // can't shrink below its text, so in a flex ROW (e.g. InteractionsTool's "Click → Set X") it sizes to content
  // and the pills come out ragged. With it, a `w-full` button shrinks to fill its column AND truncates.
  'w-full min-w-0 h-[var(--control-height)] flex items-center gap-1.5 bg-[var(--grid-line)] border border-[var(--control-border)] hover:border-[var(--control-border-hover)] cut-corners cut-border hover:[--cut-border-color:var(--control-border-hover)] cursor-pointer transition-colors text-xs text-[var(--text-primary)]';

export function ControlActionRow({ onClick, children, center, embedded = false, className, trailingAction, ...rest }: ControlActionRowProps) {
  const reducedMotion = useFieldReducedMotion();
  // Extract only data-* attributes from rest
  const dataAttrs: Record<string, string | undefined> = {};
  for (const key of Object.keys(rest)) {
    if (key.startsWith('data-')) {
      dataAttrs[key] = (rest as Record<string, string | undefined>)[key];
    }
  }

  const paddingClass = center ? 'px-3 justify-center text-center' : 'px-1';
  const baseClass = embedded
    ? 'w-full min-w-0 h-[var(--control-height)] flex items-center gap-1.5 bg-transparent border-0 cursor-pointer transition-colors text-xs text-[var(--text-primary)]'
    : BASE;

  const hasTrailingAction = trailingAction != null;
  const fieldClass = `${baseClass} ${paddingClass}${className ? ' ' + className : ''}`;
  const button = (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={!reducedMotion ? { scale: fieldMotion.actionTapScale } : undefined}
      transition={fieldSpatialTransition(reducedMotion, fieldMotion.response)}
      data-field-motion="action-press"
      className={hasTrailingAction
        ? 'flex flex-1 h-full min-w-0 items-center gap-1.5 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--selection)]'
        : fieldClass}
      {...dataAttrs}
    >
      {children}
    </motion.button>
  );
  if (!hasTrailingAction) return button;
  return (
    <div
      className={fieldClass}
      onKeyDown={event => {
        // Keep native focus traversal and button activation in this field.
        if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') event.stopPropagation();
      }}
    >
      {button}
      {trailingAction}
    </div>
  );
}

