import { useEffect, useRef } from 'react';

export const FIELD_LOADING_MESH = Object.freeze({
  colors: ['#111214', '#505257', '#8b8d90', '#2b2d30'] as const,
  distortion: 0.8,
  swirl: 0.1,
  grainMixer: 0.08,
  grainOverlay: 0.12,
  speed: 0.32,
});

/**
 * This is the same animated mesh-gradient math used by Revyme's native
 * MeshGradient code component (Paper-derived shader, Apache-2.0).
 * The loader keeps a tiny fullscreen mount rather than inventing another
 * visual effect.
 */
export const REVYME_MESH_VERTEX_SHADER = `#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
out vec2 v_objectUV;

void main() {
  v_objectUV = a_position * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const REVYME_MESH_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform float u_time;
uniform vec4 u_colors[10];
uniform float u_colorsCount;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_grainMixer;
uniform float u_grainOverlay;

in vec2 v_objectUV;
out vec4 fragColor;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float hash21(vec2 p) {
  p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float noise(vec2 n, vec2 seedOffset) {
  return valueNoise(n + seedOffset);
}

vec2 getPosition(int i, float t) {
  float a = float(i) * .37;
  float b = .6 + fract(float(i) / 3.) * .9;
  float c = .8 + fract(float(i + 1) / 4.);

  float x = sin(t * b + a);
  float y = cos(t * c + a * 1.5);

  return .5 + .5 * vec2(x, y);
}

void main() {
  vec2 uv = v_objectUV;
  uv += .5;
  vec2 grainUV = uv * 1000.;

  float mixerGrain = 0.;
  if (u_grainMixer > 0.) {
    mixerGrain = .4 * u_grainMixer * (noise(grainUV, vec2(0.)) - .5);
  }

  const float firstFrameOffset = 41.5;
  float t = .5 * (u_time + firstFrameOffset);

  float radius = smoothstep(0., 1., length(uv - .5));
  float center = 1. - radius;
  for (float i = 1.; i <= 2.; i++) {
    uv.x += u_distortion * center / i * sin(t + i * .4 * smoothstep(.0, 1., uv.y)) * cos(.2 * t + i * 2.4 * smoothstep(.0, 1., uv.y));
    uv.y += u_distortion * center / i * cos(t + i * 2. * smoothstep(.0, 1., uv.x));
  }

  vec2 uvRotated = uv;
  uvRotated -= vec2(.5);
  float angle = 3. * u_swirl * radius;
  uvRotated = rotate(uvRotated, -angle);
  uvRotated += vec2(.5);

  vec3 color = vec3(0.);
  float opacity = 0.;
  float totalWeight = 0.;

  for (int i = 0; i < 10; i++) {
    if (i >= int(u_colorsCount)) break;

    vec2 pos = getPosition(i, t) + mixerGrain;
    vec3 colorFraction = u_colors[i].rgb * u_colors[i].a;
    float opacityFraction = u_colors[i].a;

    float dist = length(uvRotated - pos);
    dist = pow(dist, 3.5);
    float weight = 1. / (dist + 1e-3);

    color += colorFraction * weight;
    opacity += opacityFraction * weight;
    totalWeight += weight;
  }

  color /= max(1e-4, totalWeight);
  opacity /= max(1e-4, totalWeight);

  if (u_grainOverlay > 0.) {
    float grainOverlay = valueNoise(rotate(grainUV, 1.) + vec2(3.));
    grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
    grainOverlay = pow(grainOverlay, 1.3);

    float grainOverlayV = grainOverlay * 2. - 1.;
    vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
    float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
    grainOverlayStrength = pow(grainOverlayStrength, .8);
    color = mix(color, grainOverlayColor, .35 * grainOverlayStrength);
    opacity += .5 * grainOverlayStrength;
  }

  opacity = clamp(opacity, 0., 1.);
  fragColor = vec4(color, opacity);
}
`;

function parseHex(value: string): [number, number, number, number] {
  const hex = value.replace('#', '').trim();
  if (hex.length !== 6) return [0, 0, 0, 1];
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
    1,
  ];
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
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

function createProgram(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, REVYME_MESH_VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, REVYME_MESH_FRAGMENT_SHADER);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }

  const program = gl.createProgram();
  if (!program) return null;
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

export default function RevymeMeshGradientLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
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
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const location = (name: string) => gl.getUniformLocation(program, name);
    const colors = FIELD_LOADING_MESH.colors.flatMap(parseHex);
    const colorsLoc = location('u_colors');
    if (colorsLoc) gl.uniform4fv(colorsLoc, new Float32Array(colors));

    const countLoc = location('u_colorsCount');
    const distortionLoc = location('u_distortion');
    const swirlLoc = location('u_swirl');
    const mixerLoc = location('u_grainMixer');
    const overlayLoc = location('u_grainOverlay');
    const timeLoc = location('u_time');

    if (countLoc) gl.uniform1f(countLoc, FIELD_LOADING_MESH.colors.length);
    if (distortionLoc) gl.uniform1f(distortionLoc, FIELD_LOADING_MESH.distortion);
    if (swirlLoc) gl.uniform1f(swirlLoc, FIELD_LOADING_MESH.swirl);
    if (mixerLoc) gl.uniform1f(mixerLoc, FIELD_LOADING_MESH.grainMixer);
    if (overlayLoc) gl.uniform1f(overlayLoc, FIELD_LOADING_MESH.grainOverlay);

    let frame = 0;
    let last = 0;
    let frameMs = 2500;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cap = Math.min(1, Math.sqrt(1920 * 1080 * 4) / Math.sqrt(width * height * dpr * dpr));
      const nextWidth = Math.max(1, Math.round(width * dpr * cap));
      const nextHeight = Math.max(1, Math.round(height * dpr * cap));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        gl.viewport(0, 0, nextWidth, nextHeight);
      }
    };

    const render = (now: number) => {
      resize();
      if (!reducedMotion) {
        const dt = last ? now - last : 0;
        last = now;
        frameMs += dt * FIELD_LOADING_MESH.speed;
      }

      gl.useProgram(program);
      if (timeLoc) gl.uniform1f(timeLoc, frameMs * 0.001);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!reducedMotion) frame = requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    render(performance.now());

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-loading-native-mesh
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}
