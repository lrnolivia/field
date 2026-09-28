// WorkspacePaneResizeHandles.tsx — persisted professional-tool pane resizing.
// The handles resize the live pane geometry only; field's intentional
// single-pane-floating / two-pane-docked presentation remains untouched.

import { useAtom, useAtomValue } from 'jotai';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  leftPaneOpenAtom,
  rightPaneOpenAtom,
  rightPaneDetachedAtom,
  leftContentWidthAtom,
  rightPaneWidthAtom,
  clampLeftContentWidth,
  clampRightPaneWidth,
} from '@/code/stores/workspace-panels-store';
import { deriveWorkspaceLayout } from '@/editor/workspace-layout';
import { trace } from '@/shared/debug-trace';

interface Props {
  hidden?: boolean;
}

export default function WorkspacePaneResizeHandles({ hidden = false }: Props) {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const rightOpen = useAtomValue(rightPaneOpenAtom);
  const rightDetached = useAtomValue(rightPaneDetachedAtom);
  const [leftContentWidth, setLeftContentWidth] = useAtom(leftContentWidthAtom);
  const [rightPaneWidth, setRightPaneWidth] = useAtom(rightPaneWidthAtom);
  const layout = deriveWorkspaceLayout(leftOpen, rightOpen, { leftContentWidth, rightPaneWidth });

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
      {rightOpen && !rightDetached && (
        <button
          type="button"
          data-workspace-resize="right"
          aria-label="Resize properties pane"
          title="Resize properties pane"
          onPointerDown={(event) => beginResize('right', event)}
          className="group fixed z-[10000] w-2 cursor-col-resize border-0 bg-transparent p-0"
          style={{
            right: layout.right.inset + layout.right.width - 4,
            top: layout.right.top,
            height: `calc(100vh - ${layout.right.top + layout.right.bottom}px)`,
          }}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border-focus)] opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}
    </>
  );
}
