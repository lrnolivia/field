// MeshGradient — Code component template (Paper-derived WebGL shader: flowing color spots with organic distortion and swirl).
//
// The __PAPER block is a generated esbuild bundle of GLSL + helpers vendored
// from paper-design/shaders (Apache-2.0, https://github.com/paper-design/shaders).
// Regenerate it with the vendor bake rather than hand-editing. The mount and
// wrapper below it are ours and follow the standard code-component shape:
// useStaticCanvas() renders a paint-once frame on the editor canvas; preview
// and the published site run the animated WebGL2 version.

import { PAPER_WEBGL_MOUNT } from './paper-webgl-mount';

export const MESH_GRADIENT_COMPONENT = `'use client';

/** @label "Mesh Gradient" */
/** @comment "Flowing mesh of color spots moving on distinct paths, warped by organic distortion and swirl. Animates in preview and on the live site." */
/** @defaultWidth 600 */
/** @defaultHeight 400 */
/** @controls {
  "color1": { "type": "color", "label": "Color 1", "default": "#e0eaff" },
  "color2": { "type": "color", "label": "Color 2", "default": "#241d9a" },
  "color3": { "type": "color", "label": "Color 3", "default": "#f75092" },
  "color4": { "type": "color", "label": "Color 4", "default": "#9f50d3" },
  "colorCount": { "type": "number", "label": "Colors used", "min": 2, "max": 4, "step": 1, "default": 4 },
  "distortion": { "type": "number", "label": "Distortion", "min": 0, "max": 1, "step": 0.05, "default": 0.8 },
  "swirl": { "type": "number", "label": "Swirl", "min": 0, "max": 1, "step": 0.05, "default": 0.1 },
  "grainMixer": { "type": "number", "label": "Grain mix", "min": 0, "max": 1, "step": 0.05, "default": 0 },
  "grainOverlay": { "type": "number", "label": "Grain overlay", "min": 0, "max": 1, "step": 0.05, "default": 0 },
  "scale": { "type": "number", "label": "Zoom", "min": 0.1, "max": 3, "step": 0.05, "default": 1 },
  "speed": { "type": "number", "label": "Speed", "min": 0, "max": 3, "step": 0.1, "default": 1 }
} */

import React, { useEffect, useRef } from 'react';
import { withResponsiveProps, useStaticCanvas } from '@revyme/runtime';

// ─── Vendored engine — paper-design/shaders (Apache-2.0) ───
// https://github.com/paper-design/shaders — generated bundle, do not hand-edit.
var __PAPER = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // entries/mesh-gradient.js
  var mesh_gradient_exports = {};
  __export(mesh_gradient_exports, {
    fragmentShader: () => meshGradientFragmentShader,
    vertexShaderSource: () => vertexShaderSource
  });

  // ../paper-shaders/packages/shaders/src/shader-utils.ts
  var declarePI = \`
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
\`;
  var rotation2 = \`
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
\`;
  var proceduralHash21 = \`
  float hash21(vec2 p) {
    p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }
\`;

  // ../paper-shaders/packages/shaders/src/shaders/mesh-gradient.ts
  var meshGradientMeta = {
    maxColorCount: 10
  };
  var meshGradientFragmentShader = \`#version 300 es
precision mediump float;

uniform float u_time;

uniform vec4 u_colors[\${meshGradientMeta.maxColorCount}];
uniform float u_colorsCount;

uniform float u_distortion;
uniform float u_swirl;
uniform float u_grainMixer;
uniform float u_grainOverlay;

in vec2 v_objectUV;
out vec4 fragColor;

\${declarePI}
\${rotation2}
\${proceduralHash21}

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

  for (int i = 0; i < \${meshGradientMeta.maxColorCount}; i++) {
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
\`;

  // ../paper-shaders/packages/shaders/src/vertex-shader.ts
  var vertexShaderSource = \`#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  #ifdef ADD_HELPERS
  v_responsiveHelperBox = uv;
  v_responsiveHelperBox *= responsiveBoxScale;
  v_responsiveHelperBox += boxOrigin * (responsiveBoxScale - 1.);
  #endif

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}\`;
  return __toCommonJS(mesh_gradient_exports);
})();

// Compact WebGL2 mount for Paper-derived shaders.
// Mirrors the essentials of @paper-design/shaders ShaderMount:
// fullscreen quad, u_time/u_resolution/u_pixelRatio, float/bool/vec/vec4[] uniforms,
// image textures with \`\${name}AspectRatio\`, DPR-capped sizing, speed-gated rAF.

function __psParseColor(input) {
  var s = String(input || '').trim();
  var m = s.match(/^#?([0-9a-f]{3,8})$/i);
  if (m) {
    var h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
    if (h.length === 6) {
      var n6 = parseInt(h, 16);
      return [((n6 >> 16) & 255) / 255, ((n6 >> 8) & 255) / 255, (n6 & 255) / 255, 1];
    }
    if (h.length === 8) {
      var n8 = parseInt(h, 16);
      return [((n8 >>> 24) & 255) / 255, ((n8 >> 16) & 255) / 255, ((n8 >> 8) & 255) / 255, (n8 & 255) / 255];
    }
  }
  var rgb = s.match(/rgba?\\(([^)]+)\\)/i);
  if (rgb) {
    var p = rgb[1].split(',').map(parseFloat);
    return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255, p.length > 3 ? p[3] : 1];
  }
  return [0, 0, 0, 1];
}

function __psLoadImage(url) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('image failed: ' + url)); };
    img.src = url;
  });
}

${PAPER_WEBGL_MOUNT}// ─── End vendored engine ───

function MeshGradient({
  color1 = '#e0eaff', color2 = '#241d9a', color3 = '#f75092', color4 = '#9f50d3', colorCount = 4, distortion = 0.8, swirl = 0.1, grainMixer = 0, grainOverlay = 0, scale = 1, speed = 1,
  ...props
}) {
  const canvasRef = useRef(null);
  const isStatic = useStaticCanvas();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mount = __psCreateMount(canvas, __PAPER.fragmentShader, __PAPER.vertexShaderSource);
    if (!mount) return;
    let disposed = false;

    const colors = [color1, color2, color3, color4].slice(0, Math.max(2, Math.min(4, Math.round(colorCount))));
    mount.setUniforms(Object.assign({ u_fit: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0, u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0 }, {
      u_scale: scale,
      u_colors: colors.map(mount.parseColor), u_colorsCount: colors.length,
      u_distortion: distortion, u_swirl: swirl,
      u_grainMixer: grainMixer, u_grainOverlay: grainOverlay
    }));
    mount.resize();
    if (isStatic) {
      mount.setFrameMs(2500);
    } else {
      mount.setSpeed(speed);
    }
    return () => { disposed = true; mount.dispose(); };
  }, [color1, color2, color3, color4, colorCount, distortion, swirl, grainMixer, grainOverlay, scale, speed, isStatic]);

  return (
    <div {...props} style={{ position: 'relative', overflow: 'hidden', ...props.style }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

export default withResponsiveProps(MeshGradient);
`;
