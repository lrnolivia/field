// PanelSearchButton.tsx — compact on-demand search action for sidebar sections.
// Search should be an action by default; the full input appears only while the
// user is actively filtering a section.

import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface PanelSearchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const PanelSearchButton = forwardRef<HTMLButtonElement, PanelSearchButtonProps>(
  ({ active = false, className = '', ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      className={`w-5 h-5 flex items-center justify-center cut-corners transition-colors cursor-pointer ${
        active
          ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
          : 'text-[var(--text-disabled)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      } ${className}`}
      {...props}
    >
      <svg
        aria-hidden
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="20" y1="20" x2="16.65" y2="16.65" />
      </svg>
    </button>
  ),
);

PanelSearchButton.displayName = 'PanelSearchButton';
export default PanelSearchButton;
