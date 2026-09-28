import { useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import DropdownMenu from '@/design-system/DropdownMenu';
import { setWorkspaceModeAtom, workspaceModeAtom } from './workspace-mode-store';

/** One mode selector in the document pill replaces separate pane mode buttons. */
export default function WorkspaceModeButton() {
  const mode = useAtomValue(workspaceModeAtom);
  const setMode = useSetAtom(setWorkspaceModeAtom);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [mode]);
  const modes = [
    { id: 'docked', label: 'Default', description: 'Panels docked' },
    { id: 'floating', label: 'Floating', description: 'Floating panels' },
    { id: 'compact', label: 'Compact', description: 'Panels tucked away' },
  ] as const;

  return <>
    <button ref={anchorRef} type="button" data-workspace-mode-trigger
      aria-label={`Workspace layout: ${mode}. Change layout`}
      aria-haspopup="menu" aria-expanded={open} title="Workspace layout"
      onClick={() => setOpen((value) => !value)}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
      <svg aria-hidden viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
        <path d="M5 2v12M11 2v12" />
        {mode === 'floating' && <path d="M7 5h2v6H7z" />}
      </svg>
    </button>
    <DropdownMenu isOpen={open} onClose={() => setOpen(false)} anchorRef={anchorRef}
      position="bottom-right" minWidth={190} hoverStyle="subtle" density="compact"
      preferredFocusItemId={mode}
      items={modes.map((item) => ({
        id: item.id,
        label: `${item.label} · ${item.description}`,
        trailingIcon: mode === item.id ? <span aria-label="Selected">✓</span> : undefined,
        onClick: () => { setMode(item.id); setOpen(false); },
      }))} />
  </>;
}
