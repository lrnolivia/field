import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAtom, useSetAtom } from 'jotai';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { leftPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from '@/editor/detached-left-panel-store';
import { PANEL_MAP } from '@/editor/left-toolbar/LeftPanel';

const PANEL_TITLES: Record<string, string> = {
  insert: 'Insert', layers: 'Pages / Layers', 'pages-layers': 'Pages / Layers',
  library: 'Library', presets: 'Styles', media: 'Media', locale: 'Localization',
  cms: 'CMS', branches: 'Branches',
};

/** The same panel component serves the dock and the expanded floating shell. */
export default function FloatingLeftPanelHost() {
  const [detached, setDetached] = useAtom(detachedLeftPanelAtom);
  const setLeftPanel = useSetAtom(leftPanelAtom);
  const setLeftOpen = useSetAtom(leftPaneOpenAtom);
  const [position, setPosition] = useState({ x: 24, y: 70 });
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPosition({ x: 24, y: 70 }); }, [detached?.panelId]);
  if (!detached) return null;
  const Panel = PANEL_MAP[detached.panelId];
  if (!Panel) return null;
  const title = PANEL_TITLES[detached.panelId] ?? detached.panelId;

  const dock = () => {
    setLeftPanel(detached.panelId);
    setLeftOpen(true);
    setDetached(null);
  };
  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const onMove = (move: PointerEvent) => {
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - rect.width - 8, move.clientX - offsetX)),
        y: Math.max(8, Math.min(window.innerHeight - rect.height - 8, move.clientY - offsetY)),
      });
    };
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  return createPortal(
    <div ref={shellRef} data-floating-left-panel={detached.panelId}
      data-expanded={detached.expanded ? 'true' : 'false'}
      className="fixed z-[11000] flex flex-col overflow-hidden rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-[var(--shadow-lg)] transition-[width,height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
      style={{ left: position.x, top: position.y, width: detached.expanded ? 'min(360px, calc(100vw - 32px))' : 264,
        height: detached.expanded ? 'min(680px, calc(100vh - 90px))' : 44 }}>
      <div onPointerDown={beginDrag}
        className="flex h-11 shrink-0 cursor-move select-none items-center gap-2 border-b border-[var(--border-light)] px-3">
        <span className="h-4 w-4 rounded-[3px] border border-[var(--text-tertiary)] opacity-60" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</span>
        <button type="button" aria-label={detached.expanded ? 'Collapse floating panel' : 'Expand floating panel'}
          title={detached.expanded ? 'Collapse' : 'Expand'}
          onClick={() => setDetached({ ...detached, expanded: !detached.expanded })}
          className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--button-secondary-bg)]">
          <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d={detached.expanded ? 'm5 7 3 3 3-3' : 'm5 9 3-3 3 3'} />
          </svg>
        </button>
        <button type="button" aria-label="Dock panel in left sidebar" title="Dock in sidebar" onClick={dock}
          className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-transparent text-[var(--text-secondary)] hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
          <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1.5" y="2" width="13" height="12" rx="1" /><path d="M5.5 2v12" />
          </svg>
        </button>
      </div>
      {detached.expanded && <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1"><Panel /></div>}
    </div>, document.body,
  );
}
