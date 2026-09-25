// RemoveButton — small inline minus action for removing authored entries.

import React from 'react';

export function RemoveButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      className="w-4 h-4 inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ml-1 shrink-0"
    >
      <svg aria-hidden width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
        <path d="M2.25 6h7.5" />
      </svg>
    </span>
  );
}

