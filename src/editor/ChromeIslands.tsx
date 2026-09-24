// ChromeIslands.tsx — opaque structural surfaces behind the editor chrome.
//
// Figma-first skin: the sidebars are DOCKED, square-edged panes. No floating
// glass, no cut corners, no sidebar shadow. Geometry stays unchanged.

const PANEL_SURFACE: React.CSSProperties = {
  background: 'var(--bg-panel)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  boxShadow: 'none',
};

export default function ChromeIslands() {
  return (
    <>
      <div
        aria-hidden
        className="fixed z-[4998] border-r border-[var(--border-light)]"
        style={{ left: 0, top: 0, width: 308, height: '100vh', ...PANEL_SURFACE }}
      />
      <div
        aria-hidden
        className="fixed z-[4998] border-b border-l border-[var(--border-light)]"
        style={{ right: 0, top: 0, width: 260, height: 52, ...PANEL_SURFACE }}
      />
      <div
        aria-hidden
        className="fixed z-[4998] border-l border-[var(--border-light)]"
        style={{ right: 0, top: 52, width: 260, height: 'calc(100vh - 52px)', ...PANEL_SURFACE }}
      />
    </>
  );
}
