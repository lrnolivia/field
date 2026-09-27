import { useEffect, useRef } from 'react';

export const LOADING_VEIL_VERTEX_SHADER = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * ReShaders / Revyme Mesh Flow · Mono.
 *
 * The effect math and Mono palette are ported from the live ReShaders
 * Mesh Flow preset rather than approximated from the loading mock.
 * Composition (Multiply, blur, bloom, centered field mark) belongs to field.
 */
export const RESHADERS_MESH_FLOW_MONO = Object.freeze({
  c1: '#2a2a2e',
  c2: '#c9c9cf',
  c3: '#f4f4f6',
  c4: '#7a7a82',
  bg: '#050505',
  warp: 0.5,
  softness: 0.45,
  speed: 0.4,
  vignette: 0.25,
  grain: 0.04,
});

export const LOADING_VEIL_BASE = '#8a8a8a';
export const LOADING_VEIL_MESH_BLEND_MODE = 'multiply';

export const LOADING_VEIL_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_aspect;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
uniform vec3 u_bg;
uniform float u_warp;
uniform float u_softness;
uniform float u_speed;
uniform float u_vignette;
uniform float u_grain;

out vec4 outColor;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(
    dot(p0, p0),
    dot(p1, p1),
    dot(p2, p2),
    dot(p3, p3)
  ));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(
    0.5 - vec4(
      dot(x0, x0),
      dot(x1, x1),
      dot(x2, x2),
      dot(x3, x3)
    ),
    0.0
  );
  m = m * m;
  return 105.0 * dot(
    m * m,
    vec4(
      dot(p0, x0),
      dot(p1, x1),
      dot(p2, x2),
      dot(p3, x3)
    )
  );
}

vec2 aspectUV(vec2 uv) {
  return (uv - 0.5) * vec2(u_aspect, 1.0);
}

vec3 pxToLin(vec3 c) {
  return mix(
    c / 12.92,
    pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c)
  );
}

vec3 pxToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(
    c * 12.92,
    1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c)
  );
}

vec3 pxLab(vec3 c) {
  vec3 lms = vec3(
    0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b,
    0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b,
    0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b
  );
  lms = sign(lms) * pow(abs(lms), vec3(1.0 / 3.0));
  return vec3(
    0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
    1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
    0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z
  );
}

vec3 pxRgb(vec3 c) {
  float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

float pxIgn(vec2 px) {
  return fract(52.9829189 * fract(0.06711056 * px.x + 0.00583715 * px.y));
}

uvec3 pxPcg3(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v;
}

vec3 pxRand3(vec2 px, float frame) {
  return vec3(pxPcg3(uvec3(uvec2(px), uint(frame))))
    * (1.0 / 4294967296.0);
}

vec3 pxAces(vec3 x) {
  return clamp(
    (x * (2.51 * x + 0.03))
      / (x * (2.43 * x + 0.59) + 0.14),
    0.0,
    1.0
  );
}

vec3 pxGrain(vec3 c, float amount) {
  float frame = floor(u_time * 12.0);
  vec3 n = pxRand3(gl_FragCoord.xy, frame);
  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float w = mix(1.0, 0.35, smoothstep(0.5, 1.0, L));
  return c + (n.x - 0.5) * amount * w;
}

float pxVignette(vec2 uv, float amount) {
  vec2 q = (uv - 0.5) * vec2(u_aspect, 1.0);
  return 1.0 - amount * smoothstep(0.4, 1.1, length(q));
}

vec3 pxPost(vec3 lin, vec2 uv, float vig, float grain, float tone) {
  lin = max(lin, 0.0) * pxVignette(uv, vig);
  vec3 c = pxToSrgb(mix(lin, pxAces(lin), tone));
  c = pxGrain(c, grain);
  c += (pxIgn(gl_FragCoord.xy) - 0.5) / 255.0;
  return clamp(c, 0.0, 1.0);
}

vec2 anchor(float i, float t) {
  float a = i * 1.7;
  return vec2(
    0.44 * sin(t * (0.5 + 0.13 * i) + a) * u_aspect,
    0.44 * cos(t * (0.41 + 0.11 * i) + a * 1.3)
  );
}

vec4 meshFlow(vec2 uv) {
  float t = u_time * u_speed * 0.35 + 3.0;
  vec2 q = aspectUV(uv);
  float wn = u_warp * 0.35;
  q += wn * vec2(
    snoise(vec3(q * 1.3, t * 0.4)),
    snoise(vec3(q * 1.3 + 9.1, t * 0.35))
  );

  vec3 cols[5] = vec3[5](u_c1, u_c2, u_c3, u_c4, u_bg);
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  float power = mix(3.6, 1.8, u_softness);

  for (int i = 0; i < 5; i++) {
    float d = length(q - anchor(float(i), t));
    float w = 1.0 / (pow(d, power) + 0.002);
    acc += pxLab(pxToLin(cols[i])) * w;
    wsum += w;
  }

  vec3 lin = max(pxRgb(acc / wsum), 0.0);
  return vec4(pxPost(lin, uv, u_vignette, u_grain, 0.25), 1.0);
}

void main() {
  vec2 resolution = max(u_resolution, vec2(1.0));
  vec2 uv = gl_FragCoord.xy / resolution;
  outColor = meshFlow(uv);
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

  return [0.5, 0.5, 0.5];
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

function setColorUniform(
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation | null,
  value: string,
) {
  if (!location) return;
  const color = parseLoadingVeilColor(value);
  gl.uniform3f(location, color[0], color[1], color[2]);
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
    const locations = {
      time: gl.getUniformLocation(program, 'u_time'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      aspect: gl.getUniformLocation(program, 'u_aspect'),
      c1: gl.getUniformLocation(program, 'u_c1'),
      c2: gl.getUniformLocation(program, 'u_c2'),
      c3: gl.getUniformLocation(program, 'u_c3'),
      c4: gl.getUniformLocation(program, 'u_c4'),
      bg: gl.getUniformLocation(program, 'u_bg'),
      warp: gl.getUniformLocation(program, 'u_warp'),
      softness: gl.getUniformLocation(program, 'u_softness'),
      speed: gl.getUniformLocation(program, 'u_speed'),
      vignette: gl.getUniformLocation(program, 'u_vignette'),
      grain: gl.getUniformLocation(program, 'u_grain'),
    };

    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    setColorUniform(gl, locations.c1, RESHADERS_MESH_FLOW_MONO.c1);
    setColorUniform(gl, locations.c2, RESHADERS_MESH_FLOW_MONO.c2);
    setColorUniform(gl, locations.c3, RESHADERS_MESH_FLOW_MONO.c3);
    setColorUniform(gl, locations.c4, RESHADERS_MESH_FLOW_MONO.c4);
    setColorUniform(gl, locations.bg, RESHADERS_MESH_FLOW_MONO.bg);

    if (locations.warp) gl.uniform1f(locations.warp, RESHADERS_MESH_FLOW_MONO.warp);
    if (locations.softness) gl.uniform1f(locations.softness, RESHADERS_MESH_FLOW_MONO.softness);
    if (locations.speed) gl.uniform1f(locations.speed, RESHADERS_MESH_FLOW_MONO.speed);
    if (locations.vignette) gl.uniform1f(locations.vignette, RESHADERS_MESH_FLOW_MONO.vignette);
    if (locations.grain) gl.uniform1f(locations.grain, RESHADERS_MESH_FLOW_MONO.grain);

    let frame = 0;
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

      if (locations.time) {
        gl.uniform1f(locations.time, reducedMotion ? 8.5 : now * 0.001);
      }
      if (locations.resolution) {
        gl.uniform2f(locations.resolution, canvas.width, canvas.height);
      }
      if (locations.aspect) {
        gl.uniform1f(locations.aspect, canvas.width / Math.max(1, canvas.height));
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!reducedMotion) frame = requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    render(performance.now());

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
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
        background: LOADING_VEIL_BASE,
        fontFamily: 'var(--loew-ui-font, Inter, sans-serif)',
      }}
    >
      <style>{`
        [data-project-loading-veil] [data-loading-mesh-fallback] {
          position: absolute;
          inset: -12%;
          transform: scale(1.08);
          filter: blur(64px);
          mix-blend-mode: multiply;
          background:
            radial-gradient(circle at 28% 34%, #f4f4f6 0 9%, #c9c9cf 24%, transparent 47%),
            radial-gradient(circle at 72% 67%, #2a2a2e 0 10%, #7a7a82 27%, transparent 52%),
            radial-gradient(circle at 58% 18%, #f4f4f6 0 8%, #7a7a82 28%, transparent 48%),
            #c9c9cf;
        }

        [data-project-loading-veil] canvas {
          position: absolute;
          inset: -10%;
          width: 120%;
          height: 120%;
          display: block;
          transform: scale(1.04);
          filter: blur(50px);
          mix-blend-mode: ${LOADING_VEIL_MESH_BLEND_MODE};
        }

        [data-project-loading-veil] [data-loading-grain] {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .18;
          mix-blend-mode: soft-light;
          background-size: 132px 132px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='132' height='132' viewBox='0 0 132 132'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4' stitchTiles='stitch' seed='13'/%3E%3C/filter%3E%3Crect width='132' height='132' filter='url(%23n)' opacity='.92'/%3E%3C/svg%3E");
        }

        [data-project-loading-veil] [data-loading-vignette] {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(255,255,255,.035) 0 22%,
            rgba(0,0,0,.025) 52%,
            rgba(0,0,0,.18) 100%
          );
        }

        [data-project-loading-veil] [data-loading-logo-stage] {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 0;
          height: 0;
          pointer-events: none;
          z-index: 2;
        }

        [data-project-loading-veil] [data-loading-logo-bloom] {
          position: absolute;
          left: 0;
          top: 0;
          width: clamp(174px, 12vw, 230px);
          aspect-ratio: 1;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            circle,
            rgba(255,255,255,.92) 0%,
            rgba(255,255,255,.66) 10%,
            rgba(255,255,255,.34) 25%,
            rgba(255,255,255,.13) 43%,
            rgba(255,255,255,0) 72%
          );
          filter: blur(18px);
          mix-blend-mode: screen;
          animation: field-loading-bloom-breathe 3.9s cubic-bezier(.45, 0, .55, 1) infinite;
        }

        [data-project-loading-veil] [data-loading-logo-bloom]::after {
          content: '';
          position: absolute;
          inset: 24%;
          border-radius: 50%;
          background: rgba(255,255,255,.48);
          filter: blur(28px);
        }

        [data-project-loading-veil] [data-loading-mark-icon] {
          position: absolute;
          left: 0;
          top: 0;
          width: clamp(70px, 5.8vw, 94px);
          height: clamp(76px, 6.2vw, 102px);
          transform: translate(-50%, -50%);
          background-image: var(--field-app-icon-trans);
          background-position: 50% 50%;
          background-size: contain;
          background-repeat: no-repeat;
          filter:
            drop-shadow(0 4px 30px rgba(255,255,255,.92))
            drop-shadow(0 4px 80px rgba(255,255,255,.68))
            drop-shadow(0 4px 160px rgba(255,255,255,.38))
            drop-shadow(0 4px 80px rgba(8,8,8,.54));
          animation: field-loading-logo-breathe 3.9s cubic-bezier(.45, 0, .55, 1) infinite;
        }

        [data-project-loading-veil] [data-loading-status-panel] {
          position: absolute;
          left: 50%;
          top: calc(50% + 104px);
          transform: translateX(-50%);
          width: min(380px, calc(100vw - 48px));
          color: rgba(255,255,255,.9);
          text-align: center;
          text-shadow: 0 1px 10px rgba(0,0,0,.38);
          z-index: 3;
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
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(20,20,20,.42);
          color: rgba(255,255,255,.92);
          font: inherit;
          font-size: 12px;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        [data-project-loading-veil] [data-loading-actions] button:last-child {
          background: transparent;
          border-color: transparent;
          color: rgba(255,255,255,.72);
        }

        @keyframes field-loading-bloom-breathe {
          0%, 100% {
            opacity: .68;
            transform: translate(-50%, -50%) scale(.92);
            filter: blur(20px) brightness(.88);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.08);
            filter: blur(18px) brightness(1.16);
          }
        }

        @keyframes field-loading-logo-breathe {
          0%, 100% {
            filter:
              brightness(.88)
              drop-shadow(0 4px 30px rgba(255,255,255,.70))
              drop-shadow(0 4px 80px rgba(255,255,255,.48))
              drop-shadow(0 4px 160px rgba(255,255,255,.28))
              drop-shadow(0 4px 80px rgba(8,8,8,.54));
          }
          50% {
            filter:
              brightness(1.08)
              drop-shadow(0 4px 30px rgba(255,255,255,1))
              drop-shadow(0 4px 80px rgba(255,255,255,.82))
              drop-shadow(0 4px 200px rgba(255,255,255,.48))
              drop-shadow(0 4px 80px rgba(8,8,8,.44));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-project-loading-veil] [data-loading-logo-bloom],
          [data-project-loading-veil] [data-loading-mark-icon] {
            animation: none !important;
          }
        }
      `}</style>

      <div data-loading-mesh-fallback aria-hidden />
      <canvas ref={canvasRef} aria-hidden />
      <div data-loading-vignette aria-hidden />
      <div data-loading-grain aria-hidden />

      <div data-loading-logo-stage aria-hidden>
        <span data-loading-logo-bloom />
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
                color: 'rgba(255,255,255,.68)',
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
  );
}
