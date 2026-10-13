export default function ModalCloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label}
    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border-none bg-[var(--button-secondary-bg)] text-[var(--text-primary)] transition-colors hover:bg-[var(--button-secondary-hover)]">
    <svg aria-hidden viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7.5 7.5 16.5 16.5M16.5 7.5l-9 9" />
    </svg>
  </button>;
}
