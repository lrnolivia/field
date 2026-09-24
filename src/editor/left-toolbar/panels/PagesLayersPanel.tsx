// PagesLayersPanel.tsx — persistent document navigation: Pages above Layers.
//
// field treats Pages and Layers as two parts of ONE document panel, not sibling
// tabs. Page switching remains available while the layer tree stays present,
// matching the design-tool reference and eliminating an unnecessary mode switch.
//
// The legacy `pages-layers` panel id is still accepted by LeftPanel for saved
// state / deep-link compatibility, but it no longer selects a separate tab.
// Library stays separate because it is an insertion surface, not document
// navigation.

import { useAtomValue } from 'jotai';
import type { LeftPanelId } from '@/code/stores/left-panel-store';
import FileExplorer from '@/editor/FileExplorer';
import LayersPanel from '@/editor/LayersPanel';
import PanelErrorBoundary from '@/editor/ui/PanelErrorBoundary';
import { selectedNodeAtom } from '@/code/stores/store';
import { trace } from '@/shared/debug-trace';

export const PAGES_LAYERS_PANEL_IDS = new Set<LeftPanelId>(['layers', 'pages-layers']);

export default function PagesLayersPanel() {
  const selectedId = useAtomValue(selectedNodeAtom);
  trace.fn('PagesLayersPanel.render', {});

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* Pages is persistent but bounded: on large projects its own region
          scrolls instead of consuming the layer tree. With a small page list
          it stays naturally compact. */}
      <div
        data-document-pages
        className="shrink-0 max-h-[38%] overflow-y-auto scrollbar-hide"
      >
        <FileExplorer />
      </div>

      <div aria-hidden className="h-px mx-2 shrink-0 bg-[var(--border-light)]" />

      {/* Layers owns the remaining height. Keep the existing containment: a
          layer-tree failure must not unmount the rest of the editor shell. */}
      <div data-document-layers className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <PanelErrorBoundary name="layers-panel" resetKey={selectedId}>
          <LayersPanel />
        </PanelErrorBoundary>
      </div>
    </div>
  );
}
