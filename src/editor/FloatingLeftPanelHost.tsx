import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAtom, useSetAtom } from 'jotai';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { leftPaneOpenAtom, leftContentWidthAtom, clampLeftContentWidth } from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from '@/editor/detached-left-panel-store';
import { PANEL_MAP } from '@/editor/left-toolbar/LeftPanel';

const PANEL_TITLES: Record<string, string> = {
  insert: 'Insert', layers: 'Pages / Layers', 'pages-layers': 'Pages / Layers',
  library: 'Library', presets: 'Styles', media: 'Media', locale: 'Localization',
  cms: 'CMS', branches: 'Branches',
};

/** The same panel component serves the dock and the floating shell. */
export default function FloatingLeftPanelHost() {
  const [detached, setDetached] = useAtom(detachedLeftPanelAtom);
  const setLeftPanel = useSetAtom(leftPanelAtom);
  const setLeftOpen = useSetAtom(leftPaneOpenAtom);
  const [contentWidth, setContentWidth] = useAtom(leftContentWidthAtom);
  const [position, setPosition] = useState({ x: 24, y: 70 });
  const [size, setSize] = useState({ width: contentWidth, height: 680 });
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosition({ x: 24, y: 70 });
    setSize({ width: contentWidth, height: Math.min(680, window.innerHeight - 90) });
    // A resize should never reset the size; this runs only on panel identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detached?.panelId]);
  if (!detached) return null;
  const Panel = PANEL_MAP[detached.panelId];
  if (!Panel) return null;
  const title = PANEL_TITLES[detached.panelId] ?? detached.panelId;

  const dock = () => {
    setContentWidth(clampLeftContentWidth(size.width));
    setLeftPanel(detached.panelId);
    setLeftOpen(true);
    setDetached(null);
  };
  const collapse = () => {
    setLeftPanel(detached.panelId);
    setDetached(null);
    setLeftOpen(false);
  };
  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    let nextX = rect.left;
    const onMove = (move: PointerEvent) => {
      nextX = Math.max(0, Math.min(window.innerWidth - rect.width - 8, move.clientX - offsetX));
      setPosition({
        x: nextX,
        y: Math.max(8, Math.min(window.innerHeight - rect.height - 8, move.clientY - offsetY)),
      });
    };
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      if (nextX <= 36 && nextX < rect.left - 8) dock();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };
  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const start = { x: event.clientX, y: event.clientY, ...size };
    document.documentElement.dataset.workspaceResizing = 'true';
    const move = (next: PointerEvent) => setSize({
      width: Math.max(220, Math.min(520, window.innerWidth - position.x - 8, start.width + next.clientX - start.x)),
      height: Math.max(280, Math.min(window.innerHeight - position.y - 8, start.height + next.clientY - start.y)),
    });
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      delete document.documentElement.dataset.workspaceResizing;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };

  return createPortal(
    <div ref={shellRef} data-floating-left-panel={detached.panelId}
      data-workspace-mode="floating"
      className="fixed z-[11000] flex flex-col overflow-hidden rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-[var(--shadow-lg)]"
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}>
      <div onPointerDown={beginDrag}
        className="flex h-11 shrink-0 cursor-move select-none items-center gap-2 border-b border-[var(--border-light)] px-3">
        <span className="h-4 w-4 rounded-[3px] border border-[var(--text-tertiary)] opacity-60" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</span>
        <button type="button" aria-label="Collapse left pane"
          title="Collapse to edge"
          onClick={collapse}
          className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--button-secondary-bg)]">
          <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1.5" y="2" width="13" height="12" rx="1" /><path d="M5.5 2v12" />
          </svg>
        </button>
        <button type="button" aria-label="Dock panel in left sidebar" title="Dock in sidebar" onClick={dock}
          className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-transparent text-[var(--text-secondary)] hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
          <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1.5" y="2" width="13" height="12" rx="1" /><path d="M5.5 2v12" />
          </svg>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1"><Panel /></div>
      <button type="button" aria-label="Resize floating left panel" title="Resize panel" onPointerDown={beginResize}
        className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-nwse-resize touch-none text-[var(--text-tertiary)]">
        <svg aria-hidden viewBox="0 0 16 16" width="16" height="16"><path d="M14 5 5 14M14 10l-4 4" stroke="currentColor" fill="none" /></svg>
      </button>
    </div>, document.body,
  );
}
