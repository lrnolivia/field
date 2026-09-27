import { useEffect, useRef } from 'react';

type State = [number, number, number, number, number, number, number?];
type Ellipse = {
  name: string;
  blend: 'normal' | 'multiply' | 'overlay';
  states: [State, State, State];
};

const W = 390;
const H = 844;
const SEGMENT_MS = 2000;
const CYCLE_MS = 6000;
const NOISE_STEP_MS = 100;

const state = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  blur: number,
  opacity = 1,
): State => [x, y, width, height, rotation, blur, opacity];

export const FIGMA_LOADING_FRAME = Object.freeze({
  fileKey: 'ywgbSYrD0fUcXmREaWjqRw',
  frameNodeId: '8:2679',
  componentSetNodeId: '8:3',
  sourceWidth: W,
  sourceHeight: H,
  frameBlendMode: 'hard-light',
  selectedVariant: 'Frame 51',
  variantDurationMs: SEGMENT_MS,
  cycleMs: CYCLE_MS,
  noiseComponentSetNodeId: '8:48',
  noiseBlendMode: 'soft-light',
  noiseStepMs: NOISE_STEP_MS,
  noiseTilePx: 256,
  gradientStops: [
    [0, '#525252'],
    [0.1958332061767578, '#3a3a3a'],
    [0.4510415494441986, '#ffffff'],
    [0.6489582061767578, '#808080'],
    [0.8624998927116394, '#7a7a7a'],
  ] as const,
  noiseAssets: [
    '/field-brand/loading/noise-1.png',
    '/field-brand/loading/noise-2.png',
    '/field-brand/loading/noise-3.png',
    '/field-brand/loading/noise-4.png',
  ] as const,
});

const ELLIPSES: readonly Ellipse[] = [
  {
    name: 'Ellipse 259',
    blend: 'normal',
    states: [
      state(218.424, 461.917, 598.372, 598.372, 112.763, 135.985),
      state(869.82, -184.18, 703.758, 703.758, -111.237, 159.935),
      state(759.696, -321.844, 709.252, 709.252, -91.704, 161.183),
    ],
  },
  {
    name: 'Ellipse 260',
    blend: 'multiply',
    states: [
      state(-43.82, 329.415, 875.883, 875.883, 63.605, 112.311),
      state(342.016, -512.339, 956.233, 956.233, -6.434, 122.614),
      state(779.692, -617.761, 783.113, 649.232, -70.725, 129.337),
    ],
  },
  {
    name: 'Ellipse 261',
    blend: 'overlay',
    states: [
      state(123.539, -520.888, 875.883, 875.883, -16.973, 112.311),
      state(894.474, 757.738, 956.233, 956.233, -179.689, 122.614),
      state(1106.301, 262.913, 1008.67, 1008.67, -152.105, 129.337),
    ],
  },
  {
    name: 'Ellipse 262',
    blend: 'normal',
    states: [
      state(384.451, 1449.583, 709.252, 709.252, 91.704, 161.183),
      state(-156.821, 615.156, 598.372, 598.372, -112.763, 135.985),
      state(494.575, 1313.806, 703.758, 703.758, 111.237, 159.935),
    ],
  },
  {
    name: 'Ellipse 263',
    blend: 'multiply',
    states: [
      state(-419.065, 747.658, 875.883, 875.883, -63.605, 112.311, 0),
      state(-419.065, 747.658, 875.883, 875.883, -63.605, 112.311, 1),
      state(596.148, 1911.784, 783.113, 649.232, 70.725, 129.337, 1),
    ],
  },
  {
    name: 'Ellipse 264',
    blend: 'overlay',
    states: [
      state(731.056, 864.826, 1008.67, 1008.67, 152.105, 129.337),
      state(-251.706, 1597.962, 875.883, 875.883, 16.973, 112.311),
      state(710.931, 335.179, 956.233, 956.233, 179.689, 122.614),
    ],
  },
  {
    name: 'Ellipse 265',
    blend: 'multiply',
    states: [
      state(-33.229, 1641.964, 956.233, 956.233, 6.434, 122.614, 0),
      state(-33.229, 1641.964, 956.233, 956.233, 6.434, 122.614, 0),
      state(-33.229, 1641.964, 956.233, 956.233, 6.434, 122.614, 1),
    ],
  },
];

const GRADIENT =
  'conic-gradient(from 90deg at 50% 50%, #525252 0%, #3a3a3a 19.58332061767578%, #ffffff 45.10415494441986%, #808080 64.89582061767578%, #7a7a7a 86.24998927116394%, #525252 100%)';

const keyframe = (s: State, offset: number): Keyframe => ({
  offset,
  left: `${s[0]}px`,
  top: `${s[1]}px`,
  width: `${s[2]}px`,
  height: `${s[3]}px`,
  transform: `rotate(${s[4]}deg)`,
  filter: `blur(${s[5]}px)`,
  opacity: s[6] ?? 1,
});

export default function ReshadersMeshFlowLayer() {
  const stage = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!stage.current || !plane.current) return;

    const fit = () => {
      const width = Math.max(1, stage.current!.clientWidth);
      const height = Math.max(1, stage.current!.clientHeight);
      // The authored Figma instance is the 390×844 component rotated 90° and
      // non-uniformly fitted to the full frame. Keep that exact relationship.
      plane.current!.style.transform =
        `matrix(0,${-(height / W)},${width / H},0,0,${height})`;
    };

    const observer = new ResizeObserver(fit);
    observer.observe(stage.current);
    fit();

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations: Animation[] = [];

    if (!reduced) {
      for (const ellipse of ELLIPSES) {
        const element = refs.current.get(ellipse.name);
        if (!element) continue;
        const [a, b, c] = ellipse.states;
        animations.push(
          element.animate(
            [
              keyframe(a, 0),
              keyframe(b, 1 / 3),
              keyframe(c, 2 / 3),
              keyframe(a, 1),
            ],
            {
              duration: CYCLE_MS,
              iterations: Infinity,
              easing: 'linear',
            },
          ),
        );
      }
    }

    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return (
    <div
      ref={stage}
      data-figma-loading-frame
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        ref={plane}
        data-figma-mesh-plane
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: H,
          transformOrigin: '0 0',
          background: '#000',
          overflow: 'hidden',
        }}
      >
        {ELLIPSES.map((ellipse) => {
          const s = ellipse.states[0];
          return (
            <div
              key={ellipse.name}
              ref={(node) => {
                if (node) refs.current.set(ellipse.name, node);
                else refs.current.delete(ellipse.name);
              }}
              data-figma-mesh-ellipse={ellipse.name}
              style={{
                position: 'absolute',
                left: s[0],
                top: s[1],
                width: s[2],
                height: s[3],
                borderRadius: '50%',
                background: GRADIENT,
                transform: `rotate(${s[4]}deg)`,
                transformOrigin: '50% 50%',
                filter: `blur(${s[5]}px)`,
                opacity: s[6] ?? 1,
                mixBlendMode: ellipse.blend,
                willChange: 'left, top, width, height, transform, filter, opacity',
              }}
            />
          );
        })}
      </div>

      <div data-figma-noise />
      <style>{`
        [data-figma-loading-frame] [data-figma-noise] {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 1;
          mix-blend-mode: soft-light;
          background-image: url("${FIGMA_LOADING_FRAME.noiseAssets[0]}");
          background-repeat: repeat;
          background-size: ${FIGMA_LOADING_FRAME.noiseTilePx}px ${FIGMA_LOADING_FRAME.noiseTilePx}px;
          animation: field-figma-noise ${NOISE_STEP_MS * 4}ms steps(1, end) infinite;
        }

        @keyframes field-figma-noise {
          0%, 24.99% { background-image: url("${FIGMA_LOADING_FRAME.noiseAssets[0]}"); }
          25%, 49.99% { background-image: url("${FIGMA_LOADING_FRAME.noiseAssets[1]}"); }
          50%, 74.99% { background-image: url("${FIGMA_LOADING_FRAME.noiseAssets[2]}"); }
          75%, 100% { background-image: url("${FIGMA_LOADING_FRAME.noiseAssets[3]}"); }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-figma-loading-frame] [data-figma-noise] {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
