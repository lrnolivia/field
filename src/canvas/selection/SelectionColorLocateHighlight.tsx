import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { selectionColorLocateAtom } from '@/code/stores/selection-color-locate-store';
import { nodesAtom } from '@/code/stores/store';
import { interactingViewportIdAtom } from '@/code/stores/viewport-store';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { getViewportPrefix } from '@/canvas/node-ops';
import { locateColorLuminance, resolveLocateLuminousRgb } from './selection-color-locate-visual';

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

/**
 * Locate renders inside the cross-origin Canvas sandbox on the actual DOM node.
 * CSS drop-shadow follows painted alpha, so text glows as glyphs, circles as
 * circles, SVG paths as paths, and rounded elements keep their real geometry.
 */
export default function SelectionColorLocateHighlight() {
  const request = useAtomValue(selectionColorLocateAtom);
  const nodes = useAtomValue(nodesAtom);
  const vpId = useAtomValue(interactingViewportIdAtom);

  useEffect(() => {
    const bridge = getCanvasBridge();
    bridge.clearSelectionColorLocateHighlights?.();
    if (!request) return;
    const prefix = getViewportPrefix(vpId);
    for (const id of request.nodeIds) {
      const tone = locateContrastTone(id, vpId, nodes);
      bridge.setSelectionColorLocateHighlight?.(
        id,
        prefix,
        resolveLocateLuminousRgb(request.tint, tone),
        tone,
        request.mode,
        request.revision,
      );
    }
    return () => bridge.clearSelectionColorLocateHighlights?.();
  }, [request, nodes, vpId]);

  return null;
}
