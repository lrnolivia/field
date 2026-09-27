import { useEffect, useRef } from 'react';

export const LOADING_VEIL_VERTEX_SHADER = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const LOADING_VEIL_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_accent;

out vec4 outColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);

  for (int i = 0; i < 5; i++) {
    value += amplitude * valueNoise(p);
    p = rotation * p * 2.03 + vec2(13.1, 7.7);
    amplitude *= 0.5;
  }

  return value;
}

float softBlob(vec2 uv, vec2 center, float radius) {
  float distanceToCenter = length(uv - center);
  return 1.0 - smoothstep(radius * 0.24, radius, distanceToCenter);
}

void main() {
  vec2 resolution = max(u_resolution, vec2(1.0));
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);

  float t = u_time * 0.085;
  vec2 domain = uv * 1.08;
  vec2 warp = vec2(
    fbm(domain * 1.15 + vec2(t * 0.26, -t * 0.17)),
    fbm(domain * 1.22 + vec2(-t * 0.19, t * 0.22) + 11.7)
  );
  domain += (warp - 0.5) * 0.58;

  vec2 c1 = vec2(-0.58 + 0.13 * sin(t * 0.91), 0.22 + 0.10 * cos(t * 0.73));
  vec2 c2 = vec2(0.48 + 0.16 * cos(t * 0.63), -0.31 + 0.12 * sin(t * 0.82));
  vec2 c3 = vec2(0.10 + 0.20 * sin(t * 0.51), 0.52 + 0.08 * cos(t * 0.67));

  float b1 = softBlob(domain, c1, 1.04);
  float b2 = softBlob(domain, c2, 0.93);
  float b3 = softBlob(domain, c3, 0.82);

  vec3 base = vec3(0.018, 0.022, 0.028);
  vec3 accent = mix(base, clamp(u_accent, 0.0, 1.0), 0.72);
  vec3 accentMuted = mix(base, accent, 0.42);
  vec3 cool = mix(base, vec3(0.085, 0.12, 0.15) + u_accent * 0.10, 0.58);

  vec3 color = base;
  color += accentMuted * b1 * 0.62;
  color += cool * b2 * 0.53;
  color += accent * b3 * 0.22;

  float organic = fbm(domain * 1.72 + warp * 1.4 + t * 0.05);
  color *= 0.88 + organic * 0.24;

  float vignette = 1.0 - smoothstep(0.44, 1.48, length(uv));
  color *= mix(0.58, 1.0, vignette);

  float grain = hash21(gl_FragCoord.xy + vec2(u_time * 37.0, u_time * 19.0)) - 0.5;
  color += grain * 0.026;

  outColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

export function parseLoadingVeilColor(value: string): [number, number, number] {
  const trimmed = value.trim();

  const shortHex = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (shortHex) {
    const chars = shortHex[1].split('');
    return chars.map((char) => parseInt(char + char, 16) / 255) as [number, number, number];
  }

  const hex = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    return [
      parseInt(hex[1].slice(0, 2), 16) / 255,
      parseInt(hex[1].slice(2, 4), 16) / 255,
      parseInt(hex[1].slice(4, 6), 16) / 255,
    ];
  }

  const rgb = trimmed.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) {
    return [
      Math.min(255, Number(rgb[1])) / 255,
      Math.min(255, Number(rgb[2])) / 255,
      Math.min(255, Number(rgb[3])) / 255,
    ];
  }

  return [0.41, 0.41, 0.41];
}

export function loadingVeilShouldShowDetails(detail?: string, recoverable = false): boolean {
  return Boolean(detail || recoverable);
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, LOADING_VEIL_VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, LOADING_VEIL_FRAGMENT_SHADER);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const showDetails = loadingVeilShouldShowDetails(detail, recoverable);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });

    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
      ]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(program, 'a_position');
    const timeUniform = gl.getUniformLocation(program, 'u_time');
    const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
    const accentUniform = gl.getUniformLocation(program, 'u_accent');

    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    let accent = parseLoadingVeilColor(
      getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#686868',
    );
    let frame = 0;

    const updateAccent = () => {
      accent = parseLoadingVeilColor(
        getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#686868',
      );
    };

    const themeObserver = new MutationObserver(updateAccent);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-field-theme', 'data-theme-mode'],
    });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const nextWidth = Math.max(1, Math.round(width * dpr));
      const nextHeight = Math.max(1, Math.round(height * dpr));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now: number) => {
      resize();
      gl.useProgram(program);
      if (timeUniform) gl.uniform1f(timeUniform, reducedMotion ? 6.5 : now * 0.001);
      if (resolutionUniform) gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      if (accentUniform) gl.uniform3f(accentUniform, accent[0], accent[1], accent[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!reducedMotion) frame = requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    render(performance.now());

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <div
      data-builder-loading-shell
      data-project-loading-veil
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        isolation: 'isolate',
        background: 'color-mix(in srgb, var(--bg-canvas, #181818) 78%, #020304 22%)',
        fontFamily: 'var(--loew-ui-font, Inter, sans-serif)',
      }}
    >
      <style>{`
        [data-project-loading-veil] [data-loading-mesh-fallback] {
          position: absolute;
          inset: -14%;
          opacity: .84;
          transform: scale(1.06);
          filter: blur(68px) saturate(.86) contrast(1.04);
          background:
            radial-gradient(circle at 24% 34%, color-mix(in srgb, var(--accent) 48%, transparent) 0 8%, transparent 31%),
            radial-gradient(circle at 76% 64%, color-mix(in srgb, var(--accent) 31%, #305167 18%, transparent) 0 7%, transparent 34%),
            radial-gradient(circle at 54% 20%, color-mix(in srgb, var(--accent) 18%, #6d7784 10%, transparent) 0 5%, transparent 28%),
            #07090c;
          animation: field-loading-mesh-drift 15s ease-in-out infinite alternate;
        }

        [data-project-loading-veil] canvas {
          position: absolute;
          inset: -7%;
          width: 114%;
          height: 114%;
          display: block;
          opacity: .92;
          transform: scale(1.045);
          filter: blur(34px) saturate(.92) contrast(1.06);
        }

        [data-project-loading-veil] [data-loading-dark-wash] {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 44%, rgba(0, 0, 0, .06) 0 12%, rgba(0, 0, 0, .20) 44%, rgba(0, 0, 0, .64) 100%),
            linear-gradient(180deg, rgba(3, 4, 6, .20), rgba(3, 4, 6, .48));
        }

        [data-project-loading-veil] [data-loading-grain] {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .17;
          mix-blend-mode: soft-light;
          background-size: 132px 132px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='132' height='132' viewBox='0 0 132 132'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4' stitchTiles='stitch' seed='13'/%3E%3C/filter%3E%3Crect width='132' height='132' filter='url(%23n)' opacity='.92'/%3E%3C/svg%3E");
        }

        [data-project-loading-veil] [data-loading-mark] {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: color-mix(in srgb, var(--bg-surface, #161616) 78%, #000 22%);
          border: 1px solid color-mix(in srgb, var(--accent) 23%, rgba(255,255,255,.10));
          box-shadow:
            0 20px 55px rgba(0, 0, 0, .36),
            inset 0 1px rgba(255,255,255,.09),
            inset 0 -1px rgba(0,0,0,.30);
        }

        [data-project-loading-veil] [data-loading-mark]::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--accent, #686868);
          opacity: .34;
          animation: field-loading-sleep-light 3.75s cubic-bezier(.45, 0, .55, 1) infinite;
        }

        [data-project-loading-veil] [data-loading-mark-icon] {
          position: relative;
          z-index: 1;
          width: 42px;
          height: 42px;
          background-image: var(--field-app-icon-trans);
          background-position: center;
          background-size: contain;
          background-repeat: no-repeat;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,.24));
        }

        [data-project-loading-veil] [data-loading-status-panel] {
          margin-top: 18px;
          max-width: 380px;
          color: rgba(255,255,255,.88);
          text-align: center;
          text-shadow: 0 1px 10px rgba(0,0,0,.4);
        }

        [data-project-loading-veil] [data-loading-actions] {
          display: flex;
          justify-content: center;
          gap: 7px;
          margin-top: 12px;
        }

        [data-project-loading-veil] [data-loading-actions] button {
          height: 29px;
          padding: 0 11px;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,.13);
          background: rgba(12,14,17,.54);
          color: rgba(255,255,255,.88);
          font: inherit;
          font-size: 12px;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        [data-project-loading-veil] [data-loading-actions] button:last-child {
          background: transparent;
          border-color: transparent;
          color: rgba(255,255,255,.62);
        }

        @keyframes field-loading-mesh-drift {
          0% { transform: scale(1.06) translate3d(-1.2%, -.8%, 0); }
          100% { transform: scale(1.12) translate3d(1.1%, .7%, 0); }
        }

        @keyframes field-loading-sleep-light {
          0%, 100% {
            opacity: .26;
            filter: brightness(.78) saturate(.86);
            box-shadow: inset 0 0 18px color-mix(in srgb, var(--accent) 10%, transparent);
          }
          50% {
            opacity: .72;
            filter: brightness(1.12) saturate(1.04);
            box-shadow: inset 0 0 36px color-mix(in srgb, var(--accent) 42%, transparent);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-project-loading-veil] [data-loading-mesh-fallback],
          [data-project-loading-veil] [data-loading-mark]::before {
            animation: none !important;
          }

          [data-project-loading-veil] [data-loading-mark]::before {
            opacity: .46;
            filter: none;
          }
        }
      `}</style>

      <div data-loading-mesh-fallback aria-hidden />
      <canvas ref={canvasRef} aria-hidden />
      <div data-loading-dark-wash aria-hidden />
      <div data-loading-grain aria-hidden />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          padding: 28,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div data-loading-mark aria-hidden>
            <span data-loading-mark-icon />
          </div>

          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={showDetails ? undefined : {
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {showDetails ? (
              <div data-loading-status-panel>
                <div style={{ fontSize: 13, fontWeight: 520 }}>{status}</div>
                {detail && (
                  <div style={{
                    marginTop: 6,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'rgba(255,255,255,.60)',
                  }}>
                    {detail}
                  </div>
                )}

                {recoverable && (
                  <div data-loading-actions>
                    <button type="button" onClick={() => window.location.reload()}>
                      Retry
                    </button>
                    <button type="button" onClick={() => window.location.assign('/')}>
                      Back to projects
                    </button>
                  </div>
                )}
              </div>
            ) : status}
          </div>
        </div>
      </div>
    </div>
  );
}
