import { useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { setWorkspaceModeAtom, workspaceModeAtom, type WorkspaceMode } from './workspace-mode-store';

const modes: { id: WorkspaceMode; label: string }[] = [
  { id: 'docked', label: 'Default' },
  { id: 'floating', label: 'Floating' },
  { id: 'compact-docked', label: 'Compact Docked' },
];

function LayoutGlyph({ mode }: { mode: WorkspaceMode }) {
  return <svg aria-hidden viewBox="0 0 18 18" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {mode === 'docked' && <><rect x="1.5" y="2" width="15" height="14" rx="2" /><path d="M5.5 2v14M12.5 2v14" /></>}
    {mode === 'floating' && <><rect x="1.5" y="2" width="15" height="14" rx="2" /><rect x="4" y="5" width="4" height="8" rx=".8" /><rect x="10" y="5" width="4" height="8" rx=".8" /></>}
    {mode === 'compact' && <><rect x="1.5" y="2" width="15" height="14" rx="2" /><path d="M5 5v8M13 5v8" /><path d="m7 7 2 2-2 2m4-4-2 2 2 2" /></>}
    {mode === 'compact-docked' && <><path d="M1.5 2h15v14h-15zM5 2v14M13 2v14" /><path d="m7 7 2 2-2 2m4-4-2 2 2 2" /></>}
  </svg>;
}

/** The title pill's single layout control unfolds into the mode choices. */
export default function WorkspaceModeButton() {
  const mode = useAtomValue(workspaceModeAtom);
  const setMode = useSetAtom(setWorkspaceModeAtom);
  const [expanded, setExpanded] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  return <div ref={groupRef} data-workspace-layout-control data-expanded={expanded}
    role="group" aria-label="Workspace layout"
    onPointerEnter={() => setExpanded(true)} onPointerLeave={() => setExpanded(false)}
    onFocusCapture={() => setExpanded(true)}
    onBlurCapture={(event) => {
      if (!groupRef.current?.contains(event.relatedTarget as Node | null)) setExpanded(false);
    }}
    className="flex h-7 shrink-0 items-center overflow-hidden rounded-[5px] transition-[width] duration-300 ease-out"
    style={{ width: expanded ? 216 : 32 }}>
    <button type="button" data-workspace-mode-trigger
      aria-label={`Layout: ${modes.find(item => item.id === mode)?.label}. Show layouts`}
      aria-expanded={expanded} title="Workspace layout"
      onClick={() => setExpanded(value => !value)}
      className="flex h-7 w-8 shrink-0 items-center justify-center gap-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
      <LayoutGlyph mode={mode} />
    </button>
    <div className="flex shrink-0 items-center gap-0.5 pl-0.5" aria-hidden={!expanded}>
      {modes.map(item => <button key={item.id} type="button"
        tabIndex={expanded ? 0 : -1} aria-label={`${item.label} layout`} aria-pressed={mode === item.id}
        title={item.label} onClick={() => { setMode(item.id); setExpanded(false); }}
        className={`flex h-7 items-center justify-center gap-1 rounded-[4px] px-1 text-[10px] transition-colors ${mode === item.id
          ? 'bg-[var(--rail-active-bg)] text-[var(--rail-active-fg)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
        <LayoutGlyph mode={item.id} /><span>{item.id === 'compact-docked' ? 'Docked' : item.id === 'floating' ? 'Float' : 'Default'}</span>
      </button>)}
    </div>
  </div>;
}
