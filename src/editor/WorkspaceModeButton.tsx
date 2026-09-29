import { useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { setWorkspaceModeAtom, workspaceModeAtom, type WorkspaceMode } from './workspace-mode-store';

export const WORKSPACE_MODE_COLLAPSED_WIDTH = 24;
export const WORKSPACE_MODE_EXPANDED_WIDTH = 150;

const modes: { id: WorkspaceMode; label: string; short: string }[] = [
  { id: 'docked', label: 'Default', short: 'Default' },
  { id: 'floating', label: 'Floating', short: 'Float' },
  { id: 'compact-docked', label: 'Compact', short: 'Compact' },
];

function LayoutGlyph({ mode }: { mode: WorkspaceMode }) {
  return <svg aria-hidden viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {mode === 'docked' && <><rect x="1.5" y="2" width="15" height="14" rx="2" /><path d="M5.5 2v14M12.5 2v14" /></>}
    {mode === 'floating' && <><rect x="1.5" y="2" width="15" height="14" rx="2" /><rect x="4" y="5" width="4" height="8" rx=".8" /><rect x="10" y="5" width="4" height="8" rx=".8" /></>}
    {mode === 'compact-docked' && <><path d="M1.5 2h15v14h-15zM5 2v14M13 2v14" /><path d="m7 7 2 2-2 2m4-4-2 2 2 2" /></>}
  </svg>;
}

export default function WorkspaceModeButton({ onExpandedChange }: { onExpandedChange?: (expanded: boolean) => void } = {}) {
  const mode = useAtomValue(workspaceModeAtom);
  const setMode = useSetAtom(setWorkspaceModeAtom);
  const [expanded, setExpandedState] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const active = modes.find(item => item.id === mode) ?? modes[0];
  const alternatives = modes.filter(item => item.id !== active.id);
  const setExpanded = (next: boolean) => { setExpandedState(next); onExpandedChange?.(next); };

  return <div ref={groupRef} data-workspace-layout-control data-expanded={expanded}
    role="group" aria-label="Workspace layout"
    onPointerEnter={() => setExpanded(true)} onPointerLeave={() => setExpanded(false)}
    onFocusCapture={() => setExpanded(true)}
    onBlurCapture={(event) => { if (!groupRef.current?.contains(event.relatedTarget as Node | null)) setExpanded(false); }}
    className="flex h-6 shrink-0 items-center overflow-hidden rounded-[4px] transition-[width] duration-300 ease-out"
    style={{ width: expanded ? WORKSPACE_MODE_EXPANDED_WIDTH : WORKSPACE_MODE_COLLAPSED_WIDTH }}>
    <button type="button" data-workspace-mode-trigger aria-label={`Layout: ${active.label}. Show layouts`}
      aria-expanded={expanded} title="Workspace layout" onClick={() => setExpanded(!expanded)}
      className={`flex h-6 shrink-0 items-center justify-center gap-1 rounded-[4px] transition-[width,padding,background-color,color] duration-200 ${expanded ? 'w-[52px] bg-[var(--rail-active-bg)] px-1 text-[var(--rail-active-fg)]' : 'w-6 px-0 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
      <LayoutGlyph mode={active.id} />
      <span className={`overflow-hidden whitespace-nowrap text-[9px] transition-[max-width,opacity] duration-200 ${expanded ? 'max-w-9 opacity-100' : 'max-w-0 opacity-0'}`}>{active.short}</span>
    </button>
    <div className={`flex shrink-0 items-center gap-0.5 pl-0.5 pr-0.5 transition-opacity duration-150 ${expanded ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!expanded}>
      {alternatives.map(item => <button key={item.id} type="button" tabIndex={expanded ? 0 : -1}
        aria-label={`${item.label} layout`} aria-pressed={false} title={item.label}
        onClick={() => { setMode(item.id); setExpanded(false); }}
        className="flex h-6 items-center justify-center gap-0.5 rounded-[4px] px-1 text-[9px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
        <LayoutGlyph mode={item.id} /><span>{item.short}</span>
      </button>)}
    </div>
  </div>;
}
