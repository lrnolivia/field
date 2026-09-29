// FIGUI3_CORRECTIVE_ICON_GROUP_20260925
import type { KeyboardEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { FieldGlyph } from '@/editor/glyph';

export interface InspectorIconButton {
  id: string;
  title: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

interface Props {
  buttons: InspectorIconButton[];
  className?: string;
  equal?: boolean;
  ariaLabel?: string;
}

/**
 * Canonical field inspector icon-group motif.
 *
 * One 1px outer border, 1px internal separators, no card chrome, one selected
 * cell. Position transforms, alignment, Auto layout modes and future property
 * actions should reuse this instead of inventing another segmented control.
 */
export default function InspectorIconButtonGroup({
  buttons,
  className = '',
  equal = true,
  ariaLabel,
}: Props) {
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const enabled = buttons
      .map((button, buttonIndex) => ({ button, buttonIndex }))
      .filter(({ button }) => !button.disabled);
    if (enabled.length < 2) return;
    const current = enabled.findIndex(({ buttonIndex }) => buttonIndex === index);
    if (current === -1) return;
    event.preventDefault();
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? enabled.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length;
    const group = event.currentTarget.parentElement;
    const target = group?.querySelectorAll<HTMLButtonElement>('button')[enabled[next].buttonIndex];
    target?.focus();
  };

  return (
    <div
      data-inspector-icon-group
      role="group"
      aria-label={ariaLabel}
      className={`flex overflow-hidden rounded-[var(--control-radius)] bg-[var(--control-bg)] ${className}`}
    >
      {buttons.map((button) => (
        <motion.button
          key={button.id}
          initial="rest"
          whileHover={!button.disabled ? 'hover' : undefined}
          whileTap={!button.disabled ? 'tap' : undefined}
          type="button"
          title={button.title}
          aria-label={button.title}
          aria-pressed={button.active || undefined}
          disabled={button.disabled}
          onClick={button.onClick}
          onKeyDown={(event) => moveFocus(event, buttons.indexOf(button))}
          className={`${equal ? 'flex-1' : ''} h-[var(--control-height)] min-w-0 px-2 flex items-center justify-center transition-colors
            ${button.active
              ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}
            ${button.disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <FieldGlyph behavior="generic">{button.icon}</FieldGlyph>
        </motion.button>
      ))}
    </div>
  );
}
