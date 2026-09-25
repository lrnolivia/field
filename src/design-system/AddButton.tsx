// AddButton.tsx — Small "+" icon button for section headers.
// FIGUI3_SIDEBAR_ADD_ACTION_20260925
// Used in: Pages +, Components +, Presets +, etc.

import { forwardRef, type ButtonHTMLAttributes } from 'react';

const AddButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[var(--bg-hover)] text-[var(--text-disabled)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ${className}`}
      {...props}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  )
);

AddButton.displayName = 'AddButton';
export default AddButton;
