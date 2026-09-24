// ChromeIslands.tsx — opaque structural surfaces behind the editor chrome.
//
// Figma-first skin: the sidebars are DOCKED, square-edged panes. No floating
// glass, no cut corners, no sidebar shadow. Width follows workspace state.

import { useAtomValue } from 'jotai';
import { leftPaneOpenAtom, rightPaneOpenAtom, LEFT_RAIL_WIDTH, LEFT_CONTENT_WIDTH, RIGHT_PANE_WIDTH } from '@/code/stores/workspace-panels-store';

const PANEL_SURFACE: React.CSSProperties = {
  background: 'var(--bg-panel)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  boxShadow: 'none',
};

export default function ChromeIslands() {
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const rightOpen = useAtomValue(rightPaneOpenAtom);
  return (
    <>
      <div
        aria-hidden
        className="fixed z-[4998] border-r border-[var(--border-light)]"
        style={{ left: 0, top: 0, width: LEFT_RAIL_WIDTH + (leftOpen ? LEFT_CONTENT_WIDTH : 0), height: '100vh', ...PANEL_SURFACE }}
      />
      <div
        aria-hidden
        className="fixed z-[4998] border-b border-l border-[var(--border-light)]"
        style={{ right: 0, top: 0, width: 260, height: 52, ...PANEL_SURFACE }}
      />
      {rightOpen && <div
        aria-hidden
        className="fixed z-[4998] border-l border-[var(--border-light)]"
        style={{ right: 0, top: 52, width: RIGHT_PANE_WIDTH, height: 'calc(100vh - 52px)', ...PANEL_SURFACE }}
      />}
    </>
  );
}
