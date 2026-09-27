import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectionColorLocateAtom } from '@/code/stores/selection-color-locate-store';
import { nodesAtom } from '@/code/stores/store';
import { interactingViewportIdAtom } from '@/code/stores/viewport-store';
import { usePolledValue } from '@/canvas/hooks/usePolledValue';
import { getScreenCornersById, cornersEqual, type ScreenCorners } from '@/canvas/resize/geometry-utils';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { getViewportPrefix } from '@/canvas/node-ops';
import { locateColorLuminance, resolveLocateDefinitionGlow } from './selection-color-locate-visual';

export function locateContrastTone(nodeId: string, vpId: string, nodes: Map<string, { parentId?: string | null; styles?: Record<string, string> }>): 'white' | 'black' {
  const bridge = getCanvasBridge();
  const prefix = getViewportPrefix(vpId);
  let current: string | null | undefined = nodeId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const node = nodes.get(current);
    const rendered = bridge.getComputedValue(current, prefix, 'backgroundColor');
    const light = locateColorLuminance(rendered || node?.styles?.backgroundColor || '');
    if (light !== null) return light >= 0.5 ? 'black' : 'white';
    current = node?.parentId;
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'black' : 'white';
}

function LocatedNode({ id, vpId, tint, mode, revision, nodes }: {
  id: string; vpId: string; tint: string | null; mode: 'hover' | 'click'; revision: number;
  nodes: Map<string, { parentId?: string | null; styles?: Record<string, string> }>;
}) {
  const corners = usePolledValue<ScreenCorners>(true, (prev) => {
    const next = getScreenCornersById(id, vpId);
    return next ? (cornersEqual(prev, next) ? prev : next) : prev;
  }, [id, vpId], { immediate: true });
  const tone = useMemo(() => locateContrastTone(id, vpId, nodes), [id, vpId, nodes]);
  const definition = useMemo(() => resolveLocateDefinitionGlow(tint, tone), [tint, tone]);
  if (!corners) return null;
  const { TL, TR, BR, BL } = corners;
  const points = `${TL.x},${TL.y} ${TR.x},${TR.y} ${BR.x},${BR.y} ${BL.x},${BL.y}`;
  const animation = mode === 'click'
    ? 'field-locate-click 1.95s cubic-bezier(.22,.7,.22,1) both'
    : 'field-locate-hover 2.5s ease-in-out infinite';

  return <g key={revision} data-locate-node={id} data-locate-mode={mode}>
    {/* Broad contrast halo: deliberately much tighter than the old 27px/17px
        treatment. SVG Gaussian blur is materially more consistent in Safari
        than CSS filter: blur() on a blended SVG stroke. */}
    <polygon data-locate-glow="contrast" points={points} fill="none" stroke={tone} strokeWidth="14" strokeLinejoin="round"
      filter="url(#field-locate-contrast-blur)"
      style={{ mixBlendMode: 'overlay', '--locate-peak': mode === 'click' ? 0.42 : 0.25,
        animation } as React.CSSProperties} />

    {/* Selected-paint atmosphere: present, but intentionally softer than the
        contrast halo and the tight definition pass. */}
    {tint && locateColorLuminance(tint) !== null && <polygon data-locate-glow="tint" points={points} fill="none" stroke={tint} strokeWidth="7" strokeLinejoin="round"
      filter="url(#field-locate-tint-blur)"
      style={{ mixBlendMode: 'screen', '--locate-peak': mode === 'click' ? 0.22 : 0.12,
        animation } as React.CSSProperties} />}

    {/* Tight definition glow: this is the visual anchor. Real colors screen;
        black overlays; white soft-lights. High opacity is safe because the
        footprint is narrow and softly feathered instead of blooming outward. */}
    <polygon data-locate-glow="definition" points={points} fill="none" stroke={definition.stroke} strokeWidth="3.5" strokeLinejoin="round"
      filter="url(#field-locate-definition-blur)"
      style={{ mixBlendMode: definition.blendMode, '--locate-peak': mode === 'click' ? 0.92 : 0.68,
        animation } as React.CSSProperties} />
  </g>;
}

export default function SelectionColorLocateHighlight() {
  const request = useAtomValue(selectionColorLocateAtom);
  const nodes = useAtomValue(nodesAtom);
  const vpId = useAtomValue(interactingViewportIdAtom);
  if (!request) return null;
  return <svg data-selection-color-locate-canvas aria-hidden style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'visible', pointerEvents: 'none', zIndex: 2 }}>
    <defs>
      <filter id="field-locate-contrast-blur" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="5.5" />
      </filter>
      <filter id="field-locate-tint-blur" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="3.25" />
      </filter>
      <filter id="field-locate-definition-blur" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="1.45" />
      </filter>
    </defs>
    <style>{`
      @keyframes field-locate-hover { 0%, 100% { opacity: calc(var(--locate-peak) * .42); } 50% { opacity: var(--locate-peak); } }
      @keyframes field-locate-click { 0% { opacity: 0; } 42% { opacity: var(--locate-peak); } 100% { opacity: 0; } }
      @media (prefers-reduced-motion: reduce) {
        [data-selection-color-locate-canvas] polygon { animation: none !important; opacity: var(--locate-peak); }
      }
    `}</style>
    {request.nodeIds.map((id) => <LocatedNode key={id} id={id} vpId={vpId} nodes={nodes} tint={request.tint} mode={request.mode} revision={request.revision} />)}
  </svg>;
}
