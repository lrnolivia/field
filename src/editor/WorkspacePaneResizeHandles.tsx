// WorkspacePaneResizeHandles.tsx — persisted professional-tool pane resizing.
// The handles resize live geometry across the three workspace modes.

import { useAtom, useAtomValue } from 'jotai';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  leftPaneOpenAtom,
  rightPaneOpenAtom,
  rightPaneDetachedAtom,
  rightPaneDragOffsetAtom,
  rightFloatingHeightAtom,
  leftCollapsedWidthAtom,
  rightCollapsedWidthAtom,
  leftContentWidthAtom,
  rightPaneWidthAtom,
  clampLeftContentWidth,
  clampRightPaneWidth,
} from '@/code/stores/workspace-panels-store';
import { deriveWorkspaceLayout } from '@/editor/workspace-layout';
import { leftRailVisibleAtom } from '@/editor/workspace-mode-store';
import { trace } from '@/shared/debug-trace';

interface Props {
  hidden?: boolean;
}

export default function WorkspacePaneResizeHandles({ hidden = false }: Props) {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const railVisible = useAtomValue(leftRailVisibleAtom);
  const rightOpen = useAtomValue(rightPaneOpenAtom);
  const rightDetached = useAtomValue(rightPaneDetachedAtom);
  const rightDragOffset = useAtomValue(rightPaneDragOffsetAtom);
  const rightFloatingHeight = useAtomValue(rightFloatingHeightAtom);
  const [leftContentWidth, setLeftContentWidth] = useAtom(leftContentWidthAtom);
  const [rightPaneWidth, setRightPaneWidth] = useAtom(rightPaneWidthAtom);
  const [leftCollapsedWidth, setLeftCollapsedWidth] = useAtom(leftCollapsedWidthAtom);
  const [rightCollapsedWidth, setRightCollapsedWidth] = useAtom(rightCollapsedWidthAtom);
  const layout = deriveWorkspaceLayout(leftOpen, rightOpen, { leftContentWidth, rightPaneWidth, rightDetached });

  if (hidden) return null;

  const beginResize = (
    side: 'left' | 'right',
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    document.documentElement.dataset.workspaceResizing = 'true';
    const startX = event.clientX;
    const startWidth = side === 'left' ? leftContentWidth : rightPaneWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const move = (e: PointerEvent) => {
      const delta = e.clientX - startX;
      if (side === 'left') setLeftContentWidth(clampLeftContentWidth(startWidth + delta));
      else setRightPaneWidth(clampRightPaneWidth(startWidth - delta));
    };
    const finish = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      delete document.documentElement.dataset.workspaceResizing;
      const delta = e.clientX - startX;
      const width = side === 'left'
        ? clampLeftContentWidth(startWidth + delta)
        : clampRightPaneWidth(startWidth - delta);
      trace.action('workspace:pane-resize', { side, width });
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  };

  const beginCompactResize = (side: 'left' | 'right', event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    document.documentElement.dataset.workspaceResizing = 'true';
    const startX = event.clientX;
    const initial = side === 'left' ? leftCollapsedWidth : rightCollapsedWidth;
    const move = (next: PointerEvent) => {
      const width = initial + (next.clientX - startX) * (side === 'left' ? 1 : -1);
      if (side === 'left') setLeftCollapsedWidth(Math.max(52, Math.min(104, width)));
      else setRightCollapsedWidth(Math.max(60, Math.min(112, width)));
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

  return (
    <>
      {leftOpen && (
        <button
          type="button"
          data-workspace-resize="left"
          aria-label="Resize left workspace"
          title="Resize left workspace"
          onPointerDown={(event) => beginResize('left', event)}
          className="group fixed z-[10000] w-2 cursor-col-resize border-0 bg-transparent p-0"
          style={{
            left: layout.left.inset + layout.left.width - 4,
            top: layout.left.top,
            height: `calc(100vh - ${layout.left.top + layout.left.bottom}px)`,
          }}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border-focus)] opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}
      {!leftOpen && railVisible && <button type="button" data-workspace-resize="left-collapsed"
        aria-label="Resize collapsed left toolbar" title="Resize collapsed toolbar" onPointerDown={(event) => beginCompactResize('left', event)}
        className="fixed top-[52px] z-[10000] h-[calc(100vh-60px)] w-2 cursor-col-resize touch-none bg-transparent"
        style={{ left: leftCollapsedWidth + 4 }} />}
      {rightOpen && (
        <button
          type="button"
          data-workspace-resize="right"
          aria-label="Resize properties pane"
          title="Resize properties pane"
          onPointerDown={(event) => beginResize('right', event)}
          className="group fixed z-[10000] w-2 cursor-col-resize border-0 bg-transparent p-0"
          style={{
            right: layout.right.inset + layout.right.width - 4 - (rightDetached ? rightDragOffset.x : 0),
            top: layout.right.top + (rightDetached ? rightDragOffset.y : 0),
            height: rightDetached ? Math.min(rightFloatingHeight, window.innerHeight - layout.right.top - rightDragOffset.y - 8) : `calc(100vh - ${layout.right.top + layout.right.bottom}px)`,
          }}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border-focus)] opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}
      {!rightOpen && <button type="button" data-workspace-resize="right-collapsed"
        aria-label="Resize collapsed Inspector" title="Resize collapsed Inspector" onPointerDown={(event) => beginCompactResize('right', event)}
        className="fixed top-2 z-[10000] h-[calc(100vh-16px)] w-2 cursor-col-resize touch-none bg-transparent"
        style={{ right: rightCollapsedWidth + 4 }} />}
    </>
  );
}
