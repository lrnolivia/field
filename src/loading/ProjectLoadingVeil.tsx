export const LOADING_VEIL_BACKDROP = Object.freeze({ blurPx: 18, grayscale: 0.2, dim: 0.56 });
export const LOADING_VEIL_LOGO_SRC = '/field-brand/monochrome/logo-light-trans.png';

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
          transition:opacity 360ms cubic-bezier(.2,.7,.2,1);
        }
        [data-loading-atmosphere] {
          position:absolute; inset:-18%; pointer-events:none;
          background:
            radial-gradient(ellipse 32% 44% at 18% 28%,rgba(189,193,205,.13),transparent 74%),
            radial-gradient(ellipse 30% 40% at 84% 70%,rgba(142,151,169,.095),transparent 72%),
            radial-gradient(ellipse 24% 32% at 68% 12%,rgba(111,119,135,.06),transparent 74%);
          opacity:.82;
          animation:field-loading-drift 12s cubic-bezier(.45,0,.55,1) infinite alternate;
          transition:opacity 280ms ease;
        }
        [data-loading-content] {
          position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
          width:min(360px,calc(100vw - 40px));
          display:flex; flex-direction:column; align-items:center;
          z-index:1; text-align:center;
          transition:opacity 240ms ease,transform 360ms cubic-bezier(.2,.7,.2,1);
        }
        [data-loading-logo] {
          display:block; width:76px; height:76px; object-fit:contain;
          opacity:.88; margin-bottom:18px;
          animation:field-loading-mark 4.8s ease-in-out infinite;
        }
        [data-loading-status-panel] { width:100%; }
        [data-loading-status] {
          color:rgba(248,248,250,.9); font-size:13px; line-height:18px;
          font-weight:500; letter-spacing:.005em;
        }
        [data-loading-progress] {
          position:relative; width:78px; height:2px; margin:14px auto 0;
          border-radius:2px; overflow:hidden; background:rgba(255,255,255,.13);
        }
        [data-loading-progress]::after {
          content:''; position:absolute; inset:0 auto 0 -42%; width:42%;
          border-radius:inherit; background:rgba(242,243,247,.76);
          animation:field-loading-progress 1.65s cubic-bezier(.55,.08,.35,.92) infinite;
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
        [data-canvas-loading-phase="enter"] [data-loading-content],
        [data-canvas-loading-phase="exit"] [data-loading-content] { transform:translate(-50%,-47%); }
        @keyframes field-loading-drift {
          from { transform:translate3d(-1.2%,.4%,0) scale(1); }
          to { transform:translate3d(1.2%,-.4%,0) scale(1.035); }
        }
        @keyframes field-loading-mark {
          0%,100% { opacity:.78; }
          50% { opacity:1; }
        }
        @keyframes field-loading-progress {
          0% { transform:translateX(0); }
          100% { transform:translateX(340%); }
        }
        @media(prefers-reduced-motion:reduce) {
          [data-loading-atmosphere], [data-loading-logo], [data-loading-progress]::after { animation:none!important; }
          [data-loading-progress]::after { left:0; width:100%; opacity:.48; }
          [data-canvas-loading-phase] [data-loading-content] { transition:none; }
        }
        @media(max-width:520px) {
          [data-loading-logo] { width:68px; height:68px; margin-bottom:15px; }
        }
      `}</style>

      <div data-loading-backdrop aria-hidden="true" />
      <div data-loading-atmosphere aria-hidden="true" />
      <div data-loading-content>
        <img data-loading-logo src={LOADING_VEIL_LOGO_SRC} alt="" aria-hidden="true" />
        <div data-loading-status-panel>
          <div data-loading-status role="status" aria-live="polite" aria-atomic="true">{status}</div>
          {detail && <div data-loading-detail>{detail}</div>}
          {!recoverable && <div data-loading-progress aria-hidden="true" />}
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
