// LeftPanel.tsx — active left content panel inside the workspace shell.

import React from 'react';
import { useAtomValue } from 'jotai';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { leftPaneOpenAtom, rightPaneOpenAtom, leftContentWidthAtom, LEFT_RAIL_WIDTH } from '@/code/stores/workspace-panels-store';
import { deriveWorkspaceLayout, workspaceBodyHeightCss, workspaceBodyTop } from '@/editor/workspace-layout';
import PagesLayersPanel from './panels/PagesLayersPanel';
import InsertPanel from './panels/insert';
import LibraryPanel from './panels/LibraryPanel';
import MediaGalleryPanel from './panels/MediaGalleryPanel';
import LocalePanel from './panels/LocalePanel';
import CmsPanel from './panels/CmsPanel';
import BranchesPanel from './panels/BranchesPanel';
import { trace } from '@/shared/debug-trace';
import './left-panel-glyphs.css';

function PresetsPanel() {
  return <LibraryPanel mode="presets" />;
}
function LibraryOnlyPanel() {
  return <LibraryPanel mode="library" />;
}

const PANEL_MAP: Record<string, React.ComponentType> = {
  insert: InsertPanel,
  'pages-layers': PagesLayersPanel,
  layers: PagesLayersPanel,
  library: LibraryOnlyPanel,
  presets: PresetsPanel,
  media: MediaGalleryPanel,
  locale: LocalePanel,
  cms: CmsPanel,
  branches: BranchesPanel,
  // Vibe owns the same slot via VibeDockShell.
};

export default function LeftPanel() {
  const activePanel = useAtomValue(leftPanelAtom);
  const leftOpen = useAtomValue(leftPaneOpenAtom);
  const rightOpen = useAtomValue(rightPaneOpenAtom);
  const leftContentWidth = useAtomValue(leftContentWidthAtom);
  const PanelComponent = PANEL_MAP[activePanel];
  if (!PanelComponent) return null;

  const workspace = deriveWorkspaceLayout(leftOpen, rightOpen, { leftContentWidth });
  trace.fn('LeftPanel.render', { activePanel, presentation: workspace.left.presentation });

  return (
    <div
      data-editor-panel="left-primary"
      data-visible={leftOpen ? 'true' : 'false'}
      aria-hidden={leftOpen ? undefined : true}
      inert={!leftOpen}
      data-tutorial="left-panel"
      className="fixed z-[5000] flex flex-col overflow-hidden"
      style={{
        left: workspace.left.inset + LEFT_RAIL_WIDTH,
        top: workspaceBodyTop(workspace.left),
        width: workspace.left.width - LEFT_RAIL_WIDTH,
        height: workspaceBodyHeightCss(workspace.left),
        paddingLeft: 6,
        paddingRight: 6,
        boxSizing: 'border-box',
        willChange: 'transform',
        isolation: 'isolate',
      }}
    >
      <PanelComponent />
    </div>
  );
}
