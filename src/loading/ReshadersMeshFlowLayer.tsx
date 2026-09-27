export const FIGMA_LOADING_FRAME = Object.freeze({
  fileKey: 'ywgbSYrD0fUcXmREaWjqRw',
  frameNodeId: '8:2679',
  meshNodeId: '8:2680',
  noiseNodeId: '8:2683',
  sourceWidth: 4568,
  sourceHeight: 2875,
  meshAsset: '/field-brand/loading/figma-mesh-b.png',
  noiseAssets: [
    '/field-brand/loading/noise-1.png',
    '/field-brand/loading/noise-2.png',
    '/field-brand/loading/noise-3.png',
    '/field-brand/loading/noise-4.png',
  ] as const,
  frameBlendMode: 'hard-light',
  noiseBlendMode: 'soft-light',
  movementDurationMs: 9600,
  noiseStepMs: 480,
});

export default function ReshadersMeshFlowLayer() {
  return (
    <div
      data-figma-loading-frame
      aria-hidden
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <img data-figma-mesh-render src={FIGMA_LOADING_FRAME.meshAsset} alt="" />

      <div data-figma-noise>
        {FIGMA_LOADING_FRAME.noiseAssets.map((src, index) => (
          <span
            key={src}
            data-noise-frame={index + 1}
            style={{ backgroundImage: `url("${src}")` }}
          />
        ))}
      </div>

      <style>{`
        [data-figma-loading-frame] [data-figma-mesh-render] {
          position: absolute;
          left: -6%;
          top: -6%;
          width: 112%;
          height: 112%;
          max-width: none;
          object-fit: cover;
          transform-origin: 50% 50%;
          animation:
            field-figma-mesh-drift ${FIGMA_LOADING_FRAME.movementDurationMs}ms
            cubic-bezier(.45,0,.55,1) infinite alternate;
          will-change: transform;
        }

        [data-figma-loading-frame] [data-figma-noise] {
          position: absolute;
          inset: 0;
          pointer-events: none;
          mix-blend-mode: ${FIGMA_LOADING_FRAME.noiseBlendMode};
          opacity: .44;
        }

        [data-figma-loading-frame] [data-noise-frame] {
          position: absolute;
          inset: 0;
          background-repeat: repeat;
          background-position: 0 0;
          background-size: 256px 256px;
          opacity: 0;
          animation:
            field-figma-noise-step ${FIGMA_LOADING_FRAME.noiseStepMs}ms
            steps(1,end) infinite;
        }

        [data-figma-loading-frame] [data-noise-frame="2"] { animation-delay: -360ms; }
        [data-figma-loading-frame] [data-noise-frame="3"] { animation-delay: -240ms; }
        [data-figma-loading-frame] [data-noise-frame="4"] { animation-delay: -120ms; }

        @keyframes field-figma-mesh-drift {
          0% {
            transform: translate3d(-2.2%,-1.1%,0) scale3d(1.07,1.045,1);
          }
          48% {
            transform: translate3d(1.8%,1.4%,0) scale3d(1.11,1.08,1);
          }
          100% {
            transform: translate3d(-1.0%,2.2%,0) scale3d(1.09,1.11,1);
          }
        }

        @keyframes field-figma-noise-step {
          0%,24.99% { opacity: 1; }
          25%,100% { opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-figma-loading-frame] [data-figma-mesh-render] {
            animation: none !important;
            transform: scale(1.07);
          }
          [data-figma-loading-frame] [data-noise-frame] {
            animation: none !important;
            opacity: 0;
          }
          [data-figma-loading-frame] [data-noise-frame="1"] {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
