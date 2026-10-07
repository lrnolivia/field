import { type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAtom, useAtomValue } from 'jotai';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { leftContentWidthAtom, floatingLeftHeightAtom, leftCollapsedWidthAtom, clampLeftContentWidth } from '@/code/stores/workspace-panels-store';
import { PANEL_MAP } from '@/editor/left-toolbar/LeftPanel';
import { compactPanelOpenAtom, floatingLeftDetailWidthAtom, floatingLeftHiddenAtom, floatingPanelCollapsedAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { resolveLeftFloatingHeight, WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_LEFT_TOP, WORKSPACE_FLOAT_SHADOW } from './workspace-layout';
import { useMobileWorkspacePresentation } from './mobile-workspace-presentation';
import { useWorkspaceViewport } from './useWorkspaceViewport';

/** Content half of the floating left island. The icon rail sits flush to its
 * left; both live below the stationary project pill. */
export default function FloatingLeftPanelHost() {
  const mode = useAtomValue(workspaceModeAtom);
  const presentation = useMobileWorkspacePresentation();
  const portraitSheet = presentation === 'portrait-sheet';
  const mobilePanel = presentation !== 'regular';
  const viewport = useWorkspaceViewport();
  const hidden = useAtomValue(floatingLeftHiddenAtom);
  const [collapsed, setCollapsed] = useAtom(floatingPanelCollapsedAtom);
  const autoHide = useAtomValue(workspaceAutoHideAtom);
  const compactOpen = useAtomValue(compactPanelOpenAtom);
  const panelId = useAtomValue(leftPanelAtom);
  const [contentWidth, setContentWidth] = useAtom(leftContentWidthAtom);
  const [height, setHeight] = useAtom(floatingLeftHeightAtom);
  const railWidth = useAtomValue(leftCollapsedWidthAtom);
  const detailWidth = useAtomValue(floatingLeftDetailWidthAtom);
  const Panel = PANEL_MAP[panelId];
  const visible = (mode === 'floating' && (!autoHide || !hidden) && !collapsed) || (mode === 'compact' && compactOpen);

  if (!Panel || (mode !== 'floating' && mode !== 'compact')) return null;

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const start = { x: event.clientX, y: event.clientY, width: contentWidth, height: resolveLeftFloatingHeight(viewport.height, height) };
    document.documentElement.dataset.workspaceResizing = 'true';
    const move = (next: PointerEvent) => {
      setContentWidth(clampLeftContentWidth(start.width + next.clientX - start.x));
      setHeight(resolveLeftFloatingHeight(window.innerHeight, Math.max(280, start.height + next.clientY - start.y)));
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
    <div
      data-floating-left-panel={panelId}
      data-workspace-mode={mode}
      data-visible={visible}
      data-mobile-panel-presentation={mobilePanel ? presentation : undefined}
      aria-hidden={!visible}
      inert={!visible}
      className="fixed z-[9999] flex flex-col overflow-hidden text-[var(--text-primary)] transition-[transform,opacity] duration-[260ms] ease-out"
      style={{
        left: portraitSheet ? 8 : WORKSPACE_FLOAT_INSET + railWidth,
        right: portraitSheet ? 8 : undefined,
        top: portraitSheet ? 'auto' : WORKSPACE_FLOAT_LEFT_TOP,
        bottom: portraitSheet ? 'calc(72px + env(safe-area-inset-bottom, 0px) + var(--field-visible-bottom, 0px))' : undefined,
        width: portraitSheet ? 'auto' : contentWidth,
        height: portraitSheet
          ? 'min(500px, calc(var(--field-visible-height, 100dvh) - 140px))'
          : resolveLeftFloatingHeight(viewport.height, height),
        maxHeight: portraitSheet ? 'calc(100dvh - 120px)' : undefined,
        boxSizing: 'border-box',
        background: portraitSheet ? 'var(--bg-panel)' : 'var(--field-chrome-pane-bg)',
        borderRadius: portraitSheet ? 12 : undefined,
        borderTopRightRadius: !portraitSheet && !detailWidth ? 8 : undefined,
        borderBottomRightRadius: !portraitSheet && !detailWidth ? 8 : undefined,
        boxShadow: portraitSheet ? WORKSPACE_FLOAT_SHADOW : undefined,
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translate(0, 0)'
          : portraitSheet ? 'translateY(calc(100% + 24px))' : 'translateX(-18px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {portraitSheet && (
        <button type="button" aria-label="Close panel" onClick={() => setCollapsed(true)}
          className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--border-light)] px-3 text-xs">
          <span className="capitalize">{panelId}</span><span aria-hidden>×</span>
        </button>
      )}
      <div data-field-panel-body className="flex min-h-0 flex-1 flex-col overflow-hidden"><Panel /></div>
      {!portraitSheet && visible && createPortal(
        <button type="button"
          aria-label="Resize floating left panel"
          title="Resize panel"
          onPointerDown={beginResize}
          className="fixed z-[10001] h-5 w-5 cursor-nwse-resize touch-none text-[var(--text-tertiary)]"
          style={{
            left: WORKSPACE_FLOAT_INSET + railWidth + contentWidth + detailWidth - 20,
            top: WORKSPACE_FLOAT_LEFT_TOP + resolveLeftFloatingHeight(viewport.height, height) - 20,
          }}>
          <svg aria-hidden viewBox="0 0 16 16" width="16" height="16">
            <path d="M14 5 5 14M14 10l-4 4" stroke="currentColor" fill="none" />
          </svg>
        </button>, document.body,
      )}
    </div>, document.body,
  );
}
