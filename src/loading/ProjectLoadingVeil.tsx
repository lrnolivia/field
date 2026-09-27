export const LOADING_VEIL_BACKDROP = Object.freeze({ blurPx: 24, grayscale: 0.2, dim: 0.56 });
export const LOADING_VEIL_LOGO_SRC = '/field-brand/loading/Logo.png';

interface ProjectLoadingVeilProps {
  status?: string;
  detail?: string;
  recoverable?: boolean;
}

export default function ProjectLoadingVeil({
  status = 'Opening project',
  detail,
  recoverable = false,
}: ProjectLoadingVeilProps) {
  return (
    <div
      data-builder-loading-shell
      data-project-loading-veil
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        fontFamily: 'var(--loew-ui-font, Inter, sans-serif)',
        color: '#f5f5f5',
      }}
    >
      <style>{`
        [data-loading-backdrop] {
          position:absolute; inset:0; pointer-events:none;
          background:rgba(12,13,16,${LOADING_VEIL_BACKDROP.dim});
          backdrop-filter:blur(${LOADING_VEIL_BACKDROP.blurPx}px) grayscale(${LOADING_VEIL_BACKDROP.grayscale});
          -webkit-backdrop-filter:blur(${LOADING_VEIL_BACKDROP.blurPx}px) grayscale(${LOADING_VEIL_BACKDROP.grayscale});
          transition:
            opacity 360ms cubic-bezier(.2,.7,.2,1),
            backdrop-filter 360ms cubic-bezier(.2,.7,.2,1),
            -webkit-backdrop-filter 360ms cubic-bezier(.2,.7,.2,1);
        }
        [data-loading-atmosphere] {
          position:absolute; inset:-18%; pointer-events:none;
          background:
            radial-gradient(ellipse 32% 44% at 18% 28%,rgba(189,193,205,.13),transparent 74%),
            radial-gradient(ellipse 30% 40% at 84% 70%,rgba(142,151,169,.095),transparent 72%),
            radial-gradient(ellipse 24% 32% at 68% 12%,rgba(111,119,135,.06),transparent 74%);
          opacity:.82;
          transition:opacity 280ms ease;
        }
        [data-loading-content] {
          position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
          width:min(360px,calc(100vw - 40px));
          display:flex; flex-direction:column; align-items:center;
          z-index:1; text-align:center;
          transition:opacity 360ms cubic-bezier(.2,.7,.2,1);
        }
        [data-loading-mark-wrap] {
          position:relative; isolation:isolate; width:48px; height:48px;
          margin-bottom:18px; display:grid; place-items:center;
        }
        [data-loading-mark-wrap]::before {
          content:""; position:absolute; z-index:-1; left:50%; top:50%;
          width:88px; height:88px; border-radius:50%; transform:translate(-50%,-50%);
          background:radial-gradient(circle,rgba(255,255,255,.3) 0%,rgba(255,255,255,.15) 27%,rgba(255,255,255,.055) 50%,transparent 72%);
          filter:blur(5px); opacity:.68;
          animation:field-loading-glow 4.8s ease-in-out infinite;
        }
        [data-loading-logo] {
          display:block; width:48px; height:48px; object-fit:contain;
          opacity:.88; animation:field-loading-mark 4.8s ease-in-out infinite;
        }
        [data-loading-status-panel] { width:100%; }
        [data-loading-status] {
          color:rgba(248,248,250,.9); font-size:13px; line-height:18px;
          font-weight:500; letter-spacing:.005em;
        }
        [data-loading-detail] {
          margin-top:7px; color:rgba(226,228,234,.62);
          font-size:12px; line-height:18px; font-weight:400;
        }
        [data-loading-actions] { display:flex; justify-content:center; gap:8px; margin-top:15px; }
        [data-loading-actions] button {
          height:30px; padding:0 11px; border-radius:6px;
          border:1px solid rgba(255,255,255,.16);
          background:rgba(255,255,255,.07); color:rgba(250,250,252,.92);
          font:inherit; font-size:12px; cursor:pointer;
          transition:background-color 140ms ease,border-color 140ms ease;
        }
        [data-loading-actions] button:hover { background:rgba(255,255,255,.12); border-color:rgba(255,255,255,.24); }
        [data-loading-actions] button:last-child { background:transparent; border-color:transparent; color:rgba(230,232,238,.7); }
        [data-canvas-loading-phase="enter"] [data-loading-backdrop],
        [data-canvas-loading-phase="enter"] [data-loading-atmosphere],
        [data-canvas-loading-phase="exit"] [data-loading-backdrop],
        [data-canvas-loading-phase="exit"] [data-loading-atmosphere],
        [data-canvas-loading-phase="enter"] [data-loading-content],
        [data-canvas-loading-phase="exit"] [data-loading-content] { opacity:0; }
        [data-canvas-loading-phase="enter"] [data-loading-backdrop],
        [data-canvas-loading-phase="exit"] [data-loading-backdrop] {
          backdrop-filter:blur(0) grayscale(0);
          -webkit-backdrop-filter:blur(0) grayscale(0);
        }
        @keyframes field-loading-mark {
          0%,100% { opacity:.78; }
          50% { opacity:1; }
        }
        @keyframes field-loading-glow {
          0%,100% { opacity:.44; transform:translate(-50%,-50%) scale(.88); }
          50% { opacity:.94; transform:translate(-50%,-50%) scale(1.12); }
        }
        @media(prefers-reduced-motion:reduce) {
          [data-loading-logo] { animation:none!important; opacity:.88; }
          [data-loading-mark-wrap]::before { animation:none!important; opacity:.68; }
          [data-canvas-loading-phase] [data-loading-content],
          [data-canvas-loading-phase] [data-loading-backdrop],
          [data-canvas-loading-phase] [data-loading-atmosphere] { transition:none; }
        }
        @media(max-width:520px) {
          [data-loading-mark-wrap] { margin-bottom:15px; }
        }
      `}</style>

      <div data-loading-backdrop aria-hidden="true" />
      <div data-loading-atmosphere aria-hidden="true" />
      <div data-loading-content>
        <div data-loading-mark-wrap>
          <img data-loading-logo src={LOADING_VEIL_LOGO_SRC} alt="" aria-hidden="true" />
        </div>
        <div data-loading-status-panel>
          <div data-loading-status role="status" aria-live="polite" aria-atomic="true">{status}</div>
          {detail && <div data-loading-detail>{detail}</div>}
          {recoverable && (
            <div data-loading-actions>
              <button type="button" onClick={() => window.location.reload()}>Retry</button>
              <button type="button" onClick={() => window.location.assign('/')}>Back to projects</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
