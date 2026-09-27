import ReshadersMeshFlowLayer, { FIGMA_LOADING_FRAME } from './ReshadersMeshFlowLayer';

export const LOADING_VEIL_BACKDROP = Object.freeze({ blurPx: 42, grayscale: 0.9 });
export const LOADING_VEIL_MESH_BLEND_MODE = FIGMA_LOADING_FRAME.frameBlendMode;
export const LOADING_VEIL_LOGO_SRC = '/field-brand/monochrome/logo-light-trans.png';
export const loadingVeilShouldShowDetails = (detail?: string, recoverable = false) =>
  Boolean(detail || recoverable);

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
  const showDetails = loadingVeilShouldShowDetails(detail, recoverable);

  return <div
    data-builder-loading-shell
    data-project-loading-veil
    style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: 'transparent',
      fontFamily: 'var(--loew-ui-font, Inter, sans-serif)',
    }}
  >
    <style>{`
      [data-loading-backdrop] {
        position:absolute; inset:0; pointer-events:none;
        background:rgba(255,255,255,.001);
        opacity:1;
        backdrop-filter:blur(${LOADING_VEIL_BACKDROP.blurPx}px) grayscale(${LOADING_VEIL_BACKDROP.grayscale});
        -webkit-backdrop-filter:blur(${LOADING_VEIL_BACKDROP.blurPx}px) grayscale(${LOADING_VEIL_BACKDROP.grayscale});
        transition:
          backdrop-filter 320ms cubic-bezier(.22,.72,.24,1),
          -webkit-backdrop-filter 320ms cubic-bezier(.22,.72,.24,1),
          opacity 280ms ease;
      }
      [data-canvas-loading-phase="enter"] [data-loading-backdrop],
      [data-canvas-loading-phase="exit"] [data-loading-backdrop] {
        opacity:0;
        backdrop-filter:blur(0) grayscale(0);
        -webkit-backdrop-filter:blur(0) grayscale(0);
      }

      [data-loading-mesh-stage] {
        position:absolute; inset:0; overflow:hidden; pointer-events:none;
        mix-blend-mode:${LOADING_VEIL_MESH_BLEND_MODE};
        opacity:1;
        transition:opacity 190ms ease;
      }
      [data-canvas-loading-phase="enter"] [data-loading-mesh-stage],
      [data-canvas-loading-phase="exit"] [data-loading-mesh-stage] { opacity:0; }

      [data-loading-logo-stage] {
        position:absolute; left:50%; top:50%; width:0; height:0;
        z-index:2; pointer-events:none; opacity:1;
        transition:opacity 260ms ease;
      }
      [data-canvas-loading-phase="enter"] [data-loading-logo-stage],
      [data-canvas-loading-phase="exit"] [data-loading-logo-stage] { opacity:0; }
      [data-loading-logo-bloom] {
        position:absolute; left:0; top:0;
        width:clamp(220px,16vw,300px); aspect-ratio:1;
        border-radius:50%; transform:translate(-50%,-50%);
        background:radial-gradient(circle,
          rgba(255,255,255,.78) 0%,
          rgba(255,255,255,.42) 12%,
          rgba(255,255,255,.20) 28%,
          rgba(255,255,255,.072) 48%,
          rgba(255,255,255,0) 74%);
        filter:blur(26px); opacity:.48; mix-blend-mode:screen;
        animation:field-sleep 6.2s cubic-bezier(.37,0,.63,1) infinite;
        transition:opacity 260ms ease;
      }
      [data-loading-logo] {
        position:absolute; left:0; top:0;
        width:clamp(48px,3.65vw,96px); aspect-ratio:1;
        transform:translate(-50%,-50%);
        display:block; overflow:hidden;
        background:#f4f4f2;
        border:1px solid rgba(255,255,255,.30);
        border-radius:22%;
        box-shadow:
          0 1px 1px rgba(255,255,255,.18) inset,
          0 7px 28px rgba(0,0,0,.20);
      }
      [data-loading-logo] img {
        position:absolute; right:8%; bottom:8%;
        width:58%; height:auto; display:block;
      }
      [data-canvas-loading-phase="waiting"] [data-loading-logo] {
        animation:field-mark-in 320ms cubic-bezier(.16,.86,.24,1) both;
      }
      [data-canvas-loading-phase="exit"] [data-loading-logo] {
        animation:field-mark-out 220ms cubic-bezier(.55,.08,.82,.34) both;
      }
      [data-canvas-loading-phase="enter"] [data-loading-logo] { opacity:0; }

      @keyframes field-mark-in {
        0% { opacity:0; transform:translate(-50%,-50%) scale(.76); }
        72% { opacity:1; transform:translate(-50%,-50%) scale(1.035); }
        100% { opacity:1; transform:translate(-50%,-50%) scale(1); }
      }
      @keyframes field-mark-out {
        from { opacity:1; transform:translate(-50%,-50%) scale(1); }
        to { opacity:0; transform:translate(-50%,-50%) scale(0); }
      }
      @keyframes field-sleep {
        0%,100% { opacity:.39; filter:blur(29px) brightness(.88); }
        50% { opacity:.62; filter:blur(25px) brightness(1.08); }
      }

      [data-loading-status-panel] {
        position:absolute; left:50%; top:calc(50% + 118px);
        transform:translateX(-50%);
        width:min(380px,calc(100vw - 48px));
        color:rgba(255,255,255,.92);
        text-align:center; text-shadow:0 1px 10px rgba(0,0,0,.42);
        z-index:3;
      }
      [data-loading-actions] {
        display:flex; justify-content:center; gap:7px; margin-top:12px;
      }
      [data-loading-actions] button {
        height:29px; padding:0 11px; border-radius:7px;
        border:1px solid rgba(255,255,255,.18);
        background:rgba(20,20,20,.42); color:rgba(255,255,255,.92);
        font:inherit; font-size:12px;
        backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
      }
      [data-loading-actions] button:last-child {
        background:transparent; border-color:transparent;
        color:rgba(255,255,255,.72);
      }

      @media(prefers-reduced-motion:reduce) {
        [data-canvas-loading-phase] [data-loading-logo] {
          animation:none!important;
          transform:translate(-50%,-50%)!important;
        }
        [data-loading-logo-bloom] {
          animation:none!important; opacity:.5; filter:blur(26px);
        }
      }
    `}</style>

    <div data-loading-backdrop aria-hidden />
    <div data-loading-mesh-stage aria-hidden><ReshadersMeshFlowLayer /></div>

    <div data-loading-logo-stage aria-hidden>
      <span data-loading-logo-bloom />
      <span data-loading-logo><img src={LOADING_VEIL_LOGO_SRC} alt="" /></span>
    </div>

    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={showDetails ? undefined : {
        position:'absolute', width:1, height:1, padding:0, margin:-1,
        overflow:'hidden', clip:'rect(0,0,0,0)', whiteSpace:'nowrap', border:0,
      }}
    >
      {showDetails
        ? <div data-loading-status-panel>
            <div style={{fontSize:13,fontWeight:520}}>{status}</div>
            {detail && <div style={{marginTop:6,fontSize:12,lineHeight:1.5,color:'rgba(255,255,255,.68)'}}>{detail}</div>}
            {recoverable && <div data-loading-actions>
              <button type="button" onClick={() => window.location.reload()}>Retry</button>
              <button type="button" onClick={() => window.location.assign('/')}>Back to projects</button>
            </div>}
          </div>
        : status}
    </div>
  </div>;
}
