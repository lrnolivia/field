import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectionColorLocateAtom } from '@/code/stores/selection-color-locate-store';
import { nodesAtom } from '@/code/stores/store';
import { interactingViewportIdAtom } from '@/code/stores/viewport-store';
import { usePolledValue } from '@/canvas/hooks/usePolledValue';
import { getScreenCornersById, cornersEqual, type ScreenCorners } from '@/canvas/resize/geometry-utils';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { getViewportPrefix } from '@/canvas/node-ops';

function luminance(color: string): number | null {
  const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  let channels: number[] | null = null;
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].split('').map((v) => v + v).join('') : hex[1];
    channels = [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16));
  } else {
    const rgb = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i);
    if (rgb) {
      if (rgb[4] != null && Number(rgb[4]) < 0.05) return null;
      channels = rgb.slice(1, 4).map(Number);
    }
  }
  return channels ? (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) / 255 : null;
}

export function locateContrastTone(nodeId: string, vpId: string, nodes: Map<string, { parentId?: string | null; styles?: Record<string, string> }>): 'white' | 'black' {
  const bridge = getCanvasBridge();
  const prefix = getViewportPrefix(vpId);
  let current: string | null | undefined = nodeId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const node = nodes.get(current);
    const rendered = bridge.getComputedValue(current, prefix, 'backgroundColor');
    const light = luminance(rendered || node?.styles?.backgroundColor || '');
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
  if (!corners) return null;
  const { TL, TR, BR, BL } = corners;
  const points = `${TL.x},${TL.y} ${TR.x},${TR.y} ${BR.x},${BR.y} ${BL.x},${BL.y}`;
  return <g key={revision} data-locate-node={id} data-locate-mode={mode}>
    <polygon points={points} fill="none" stroke={tone} strokeWidth="27" strokeLinejoin="round"
      style={{ mixBlendMode: 'overlay', filter: 'blur(17px)', '--locate-peak': mode === 'click' ? 0.35 : 0.21,
        animation: mode === 'click' ? 'field-locate-click 2.1s ease-in-out both' : 'field-locate-hover 2.4s ease-in-out infinite' } as React.CSSProperties} />
    {tint && <polygon points={points} fill="none" stroke={tint} strokeWidth="14" strokeLinejoin="round"
      style={{ mixBlendMode: 'screen', filter: 'blur(12px)', '--locate-peak': mode === 'click' ? 0.3 : 0.16,
        animation: mode === 'click' ? 'field-locate-click 2.1s ease-in-out both' : 'field-locate-hover 2.4s ease-in-out infinite' } as React.CSSProperties} />}
  </g>;
}

export default function SelectionColorLocateHighlight() {
  const request = useAtomValue(selectionColorLocateAtom);
  const nodes = useAtomValue(nodesAtom);
  const vpId = useAtomValue(interactingViewportIdAtom);
  if (!request) return null;
  return <svg data-selection-color-locate-canvas aria-hidden style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'visible', pointerEvents: 'none', zIndex: 2 }}>
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
