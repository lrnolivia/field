import type { ReactNode } from 'react';

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
  return (
    <div
      data-inspector-icon-group
      role="group"
      aria-label={ariaLabel}
      className={`flex overflow-hidden rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] ${className}`}
    >
      {buttons.map((button, index) => (
        <button
          key={button.id}
          type="button"
          title={button.title}
          aria-label={button.title}
          aria-pressed={button.active || undefined}
          disabled={button.disabled}
          onClick={button.onClick}
          className={`${equal ? 'flex-1' : ''} h-[var(--control-height)] min-w-0 px-2 flex items-center justify-center transition-colors
            ${index > 0 ? 'border-l border-[var(--control-border)]' : ''}
            ${button.active
              ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}
            ${button.disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {button.icon}
        </button>
      ))}
    </div>
  );
}
