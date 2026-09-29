import { useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { setWorkspaceModeAtom, workspaceModeAtom, type WorkspaceMode } from './workspace-mode-store';

const modes: { id: WorkspaceMode; label: string; short: string }[] = [
  { id: 'docked', label: 'Default', short: 'Default' },
  { id: 'floating', label: 'Floating', short: 'Float' },
  { id: 'compact-docked', label: 'Compact', short: 'Compact' },
];

function LayoutGlyph({ mode }: { mode: WorkspaceMode }) {
  return <svg aria-hidden viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {mode === 'docked' && <><rect x="1.5" y="2" width="15" height="14" rx="2" /><path d="M5.5 2v14M12.5 2v14" /></>}
    {mode === 'floating' && <><rect x="1.5" y="2" width="15" height="14" rx="2" /><rect x="4" y="5" width="4" height="8" rx=".8" /><rect x="10" y="5" width="4" height="8" rx=".8" /></>}
    {mode === 'compact-docked' && <><path d="M1.5 2h15v14h-15zM5 2v14M13 2v14" /><path d="m7 7 2 2-2 2m4-4-2 2 2 2" /></>}
  </svg>;
}

/** The chooser occupies its title surface; it never changes the outer width. */
export default function WorkspaceModeButton() {
  const mode = useAtomValue(workspaceModeAtom);
  const setMode = useSetAtom(setWorkspaceModeAtom);
  const [expanded, setExpanded] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const active = modes.find(item => item.id === mode) ?? modes[0];

  return <div ref={groupRef} data-workspace-layout-control data-expanded={expanded ? 'true' : 'false'}
    role="group" aria-label="Workspace layout"
    onPointerLeave={() => setExpanded(false)}
    onBlurCapture={(event) => { if (!groupRef.current?.contains(event.relatedTarget as Node | null)) setExpanded(false); }}
    className="absolute right-[7px] top-0 z-20 flex h-full items-center overflow-hidden rounded-[6px] bg-[var(--bg-panel)] transition-[width] duration-300 ease-out"
    style={{ width: expanded ? 'calc(100% - 14px)' : 26 }}>
    <button type="button" data-workspace-mode-trigger aria-label={`Layout: ${active.label}. Show layouts`}
      aria-expanded={expanded} title="Workspace layout"
      onPointerEnter={() => setExpanded(true)} onFocus={() => setExpanded(true)}
      onClick={() => setExpanded(!expanded)}
      className={`flex h-7 w-[26px] shrink-0 items-center justify-center rounded-[4px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] ${expanded ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      tabIndex={expanded ? -1 : 0}>
      <LayoutGlyph mode={active.id} />
    </button>
    <div className={`absolute inset-0 flex items-center justify-around gap-1 transition-[opacity,transform] duration-200 ${expanded ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0'}`} aria-hidden={!expanded}>
      {modes.map(item => <button key={item.id} type="button" tabIndex={expanded ? 0 : -1}
        aria-label={`${item.label} layout`} aria-pressed={item.id === mode} title={item.label}
        onClick={() => { if (item.id !== mode) setMode(item.id); setExpanded(false); }}
        className={`flex h-7 min-w-0 items-center justify-center gap-1 rounded-[4px] px-1 text-[10px] transition-colors ${item.id === mode ? 'bg-[var(--rail-active-bg)] text-[var(--rail-active-fg)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
        <LayoutGlyph mode={item.id} /><span className="truncate">{item.short}</span>
      </button>)}
    </div>
  </div>;
}
