// PagesLayersPanel.tsx — persistent document navigation: Pages above Layers.
// The split is a real resizable workspace boundary, matching Figma UI3's
// Pages/Layers document panel instead of stacking two unrelated cards.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useAtomValue } from 'jotai';
import type { LeftPanelId } from '@/code/stores/left-panel-store';
import FileExplorer from '@/editor/FileExplorer';
import LayersPanel from '@/editor/LayersPanel';
import PanelErrorBoundary from '@/editor/ui/PanelErrorBoundary';
import { selectedNodeAtom } from '@/code/stores/store';
import { trace } from '@/shared/debug-trace';
import {
  DEFAULT_PAGES_RATIO,
  clampPagesRatio,
  parseStoredPagesRatio,
  ratioFromPointer,
} from './pages-layers-split';
import './pages-layers.css';

const SPLIT_STORAGE_KEY = 'field:pages-layers:pages-ratio';

export const PAGES_LAYERS_PANEL_IDS = new Set<LeftPanelId>(['layers', 'pages-layers']);

function initialPagesRatio(): number {
  if (typeof window === 'undefined') return DEFAULT_PAGES_RATIO;
  try {
    return parseStoredPagesRatio(window.localStorage.getItem(SPLIT_STORAGE_KEY));
  } catch {
    return DEFAULT_PAGES_RATIO;
  }
}

export default function PagesLayersPanel() {
  const selectedId = useAtomValue(selectedNodeAtom);
  const shellRef = useRef<HTMLDivElement>(null);
  const [pagesRatio, setPagesRatio] = useState(initialPagesRatio);
  trace.fn('PagesLayersPanel.render', { pagesRatio });

  useEffect(() => {
    try {
      window.localStorage.setItem(SPLIT_STORAGE_KEY, String(pagesRatio));
    } catch {
      // Storage is a convenience. The splitter remains fully functional
      // when localStorage is unavailable.
    }
  }, [pagesRatio]);

  const updateFromClientY = useCallback((clientY: number) => {
    const shell = shellRef.current;
    if (!shell) return;
    const rect = shell.getBoundingClientRect();
    setPagesRatio(ratioFromPointer(clientY, rect.top, rect.height));
  }, []);

  const beginResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    updateFromClientY(event.clientY);

    const onMove = (moveEvent: PointerEvent) => updateFromClientY(moveEvent.clientY);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
  }, [updateFromClientY]);

  const handleSeparatorKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.05 : 0.02;
    let next: number | null = null;
    if (event.key === 'ArrowUp') next = pagesRatio - step;
    if (event.key === 'ArrowDown') next = pagesRatio + step;
    if (event.key === 'Home') next = 0.12;
    if (event.key === 'End') next = 0.62;
    if (next == null) return;
    event.preventDefault();
    setPagesRatio(clampPagesRatio(next));
  }, [pagesRatio]);

  return (
    <div
      ref={shellRef}
      data-field-document-panel
      className="flex flex-col h-full overflow-hidden min-h-0"
    >
      <div
        data-document-pages
        className="shrink-0 overflow-y-auto scrollbar-hide"
        style={{ flexBasis: `${pagesRatio * 100}%`, minHeight: 72, maxHeight: '62%' }}
      >
        <FileExplorer />
      </div>

      <div
        role="separator"
        aria-label="Resize Pages and Layers"
        aria-orientation="horizontal"
        aria-valuemin={12}
        aria-valuemax={62}
        aria-valuenow={Math.round(pagesRatio * 100)}
        tabIndex={0}
        data-field-pages-splitter
        onPointerDown={beginResize}
        onDoubleClick={() => setPagesRatio(DEFAULT_PAGES_RATIO)}
        onKeyDown={handleSeparatorKeyDown}
        title="Drag to resize Pages and Layers · Double-click to reset"
      />

      <div data-document-layers className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <PanelErrorBoundary name="layers-panel" resetKey={selectedId}>
          <LayersPanel />
        </PanelErrorBoundary>
      </div>
    </div>
  );
}
