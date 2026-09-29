import { useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useAtom, useAtomValue } from 'jotai';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { leftContentWidthAtom, floatingLeftHeightAtom, leftCollapsedWidthAtom, clampLeftContentWidth } from '@/code/stores/workspace-panels-store';
import { PANEL_MAP } from '@/editor/left-toolbar/LeftPanel';
import { compactPanelOpenAtom, floatingLeftHiddenAtom, floatingPanelCollapsedAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_LEFT_TOP } from './workspace-layout';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from './motion';

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
  const reducedMotion = useFieldReducedMotion();
  const structuralTransition = fieldSpatialTransition(reducedMotion, fieldMotion.structural);

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
      if (mode !== 'floating') {
        setHeight(Math.max(280, Math.min(window.innerHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET, start.height + next.clientY - start.y)));
      }
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
    <motion.div layout={reducedMotion ? false : 'position'} initial={false}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -18 }} transition={structuralTransition}
      data-floating-left-panel={panelId} data-workspace-mode={mode} data-visible={visible}
      aria-hidden={!visible} inert={!visible}
      className="fixed z-[5001] flex flex-col overflow-hidden text-[var(--text-primary)]"
      style={{ left: WORKSPACE_FLOAT_INSET + railWidth, top: WORKSPACE_FLOAT_LEFT_TOP, width: contentWidth, height: mode === 'floating' ? `calc(100vh - ${WORKSPACE_FLOAT_LEFT_TOP + WORKSPACE_FLOAT_INSET}px)` : Math.min(height, window.innerHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET),
        pointerEvents: visible ? 'auto' : 'none' }}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1"><Panel /></div>
      <button type="button"
        aria-label={mode === 'floating' ? 'Resize floating left panel width' : 'Resize floating left panel'}
        title={mode === 'floating' ? 'Resize panel width' : 'Resize panel'}
        onPointerDown={beginResize}
        className={`absolute bottom-0 right-0 z-10 h-5 w-5 touch-none text-[var(--text-tertiary)] ${mode === 'floating' ? 'cursor-ew-resize' : 'cursor-nwse-resize'}`}>
        <svg aria-hidden viewBox="0 0 16 16" width="16" height="16">
          {mode === 'floating'
            ? <path d="M6 4 3 8l3 4M10 4l3 4-3 4" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M14 5 5 14M14 10l-4 4" stroke="currentColor" fill="none" />}
        </svg>
      </button>
    </motion.div>, document.body,
  );
}
