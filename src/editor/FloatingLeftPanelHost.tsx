import { useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAtom, useAtomValue } from 'jotai';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { leftContentWidthAtom, floatingLeftHeightAtom, leftCollapsedWidthAtom, clampLeftContentWidth } from '@/code/stores/workspace-panels-store';
import { PANEL_MAP } from '@/editor/left-toolbar/LeftPanel';
import { compactPanelOpenAtom, floatingLeftHiddenAtom, floatingPanelCollapsedAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_LEFT_TOP } from './workspace-layout';

/** Content half of the floating left island. The icon rail sits flush to its
 * left; both live below the stationary project pill. */
export default function FloatingLeftPanelHost() {
  const mode = useAtomValue(workspaceModeAtom);
  const hidden = useAtomValue(floatingLeftHiddenAtom);
  const collapsed = useAtomValue(floatingPanelCollapsedAtom);
  const autoHide = useAtomValue(workspaceAutoHideAtom);
  const compactOpen = useAtomValue(compactPanelOpenAtom);
  const panelId = useAtomValue(leftPanelAtom);
  const [contentWidth, setContentWidth] = useAtom(leftContentWidthAtom);
  const [height, setHeight] = useAtom(floatingLeftHeightAtom);
  const railWidth = useAtomValue(leftCollapsedWidthAtom);
  const Panel = PANEL_MAP[panelId];
  const visible = (mode === 'floating' && (!autoHide || !hidden) && !collapsed) || (mode === 'compact' && compactOpen);

  useEffect(() => {
    setHeight((current) => Math.min(current, Math.max(280, window.innerHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET)));
  }, [mode]);

  if (!Panel || (mode !== 'floating' && mode !== 'compact')) return null;

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const start = { x: event.clientX, y: event.clientY, width: contentWidth, height };
    document.documentElement.dataset.workspaceResizing = 'true';
    const move = (next: PointerEvent) => {
      setContentWidth(clampLeftContentWidth(start.width + next.clientX - start.x));
      setHeight(Math.max(280, Math.min(window.innerHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET, start.height + next.clientY - start.y)));
    };
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
    <div data-floating-left-panel={panelId} data-workspace-mode={mode} data-visible={visible}
      aria-hidden={!visible} inert={!visible}
      className="fixed z-[5001] flex flex-col overflow-hidden text-[var(--text-primary)] transition-[transform,opacity] duration-[260ms] ease-out"
      style={{ left: WORKSPACE_FLOAT_INSET + railWidth, top: WORKSPACE_FLOAT_LEFT_TOP, width: contentWidth, height: Math.min(height, window.innerHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET),
        opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-18px)', pointerEvents: visible ? 'auto' : 'none' }}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1"><Panel /></div>
      <button type="button"
        aria-label="Resize floating left panel"
        title="Resize panel"
        onPointerDown={beginResize}
        className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-nwse-resize touch-none text-[var(--text-tertiary)]">
        <svg aria-hidden viewBox="0 0 16 16" width="16" height="16">
          <path d="M14 5 5 14M14 10l-4 4" stroke="currentColor" fill="none" />
        </svg>
      </button>
    </div>, document.body,
  );
}
