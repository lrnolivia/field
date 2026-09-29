import { useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useAtom, useAtomValue } from 'jotai';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { leftContentWidthAtom, floatingLeftHeightAtom, leftCollapsedWidthAtom, clampLeftContentWidth } from '@/code/stores/workspace-panels-store';
import { PANEL_MAP } from '@/editor/left-toolbar/LeftPanel';
import { compactPanelOpenAtom, floatingLeftHiddenAtom, floatingPanelCollapsedAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_LEFT_TOP } from './workspace-layout';
import { createFieldRafCoalescer, fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from './motion';

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
    const host = event.currentTarget.closest('[data-floating-left-panel]') as HTMLElement | null;
    const backing = document.querySelector<HTMLElement>('[data-workspace-island="left"]');
    let finalWidth = start.width;
    let finalHeight = start.height;
    const coalescer = createFieldRafCoalescer((geometry: { width: number; height: number }) => {
      if (host) {
        host.style.width = geometry.width + 'px';
        host.style.height = geometry.height + 'px';
      }
      if (backing) {
        backing.style.width = (railWidth + geometry.width) + 'px';
        backing.style.height = geometry.height + 'px';
      }
    });
    document.documentElement.dataset.workspaceResizing = 'true';
    const move = (next: PointerEvent) => {
      finalWidth = clampLeftContentWidth(start.width + next.clientX - start.x);
      finalHeight = Math.max(280, Math.min(window.innerHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET, start.height + next.clientY - start.y));
      coalescer.schedule({ width: finalWidth, height: finalHeight });
    };
    const stop = () => {
      coalescer.flush();
      setContentWidth(finalWidth);
      setHeight(finalHeight);
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
      style={{ left: WORKSPACE_FLOAT_INSET + railWidth, top: WORKSPACE_FLOAT_LEFT_TOP, width: contentWidth, height: Math.min(height, window.innerHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET),
        pointerEvents: visible ? 'auto' : 'none' }}>
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
    </motion.div>, document.body,
  );
}
