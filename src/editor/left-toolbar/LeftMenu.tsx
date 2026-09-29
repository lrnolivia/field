// LeftMenu.tsx — 52px icon strip for the left toolbar.
// FigUI3 command rail: compact neutral controls, functional selection accent, restrained floating tooltip.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { FieldGlyph, type FieldGlyphBehavior } from '@/editor/glyph';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { leftPanelAtom, codeEditorOpenAtom, DEFAULT_LEFT_PANEL, type LeftPanelId } from '@/code/stores/left-panel-store';
import { leftPaneOpenAtom, rightPaneOpenAtom, leftCollapsedWidthAtom, floatingLeftHeightAtom } from '@/code/stores/workspace-panels-store';
import { detachedLeftPanelAtom } from '@/editor/detached-left-panel-store';
import { compactPanelOpenAtom, floatingLeftHiddenAtom, floatingPanelCollapsedAtom, leftRailVisibleAtom, setWorkspaceModeAtom, workspaceModeAtom } from '@/editor/workspace-mode-store';
import { deriveWorkspaceLayout, workspaceBodyHeightCss, workspaceBodyTop, WORKSPACE_FLOAT_INSET, WORKSPACE_FLOAT_LEFT_TOP } from '@/editor/workspace-layout';
import { aiChatDetachedAtom } from '@/code/stores/editor-store';
import { componentEditorFileAtom } from '@/code/stores/component-editor-store';
import { pluginEditorFileAtom } from '@/editor/plugin-editor/plugin-editor-store';
import { cmsEditorOpenAtom } from '@/code/stores/cms-editor-store';
import { agentStatusAtom } from '@/code/stores/agent-chat-store';
import { ChatImageIcon, SettingsConnectAiIcon } from '@/shared/icons';
import EditorAppearanceControl from '@/editor/EditorAppearanceControl';
import { settingsOverlayOpenAtom, settingsSectionAtom } from '@/code/stores/website-settings-store';
import {
  FigmaPlusIcon as InsertPlusIcon,
  FigmaCmsIcon as CmsIcon,
  FigmaLibraryIcon as LibraryStackIcon,
  FigmaBranchIcon as BranchIcon,
  FigmaCodeIcon,
  FigmaLayersIcon,
} from '@/shared/loew-figma-icons';
import { useIsViewer, useIsViewerRole } from '@/code/stores/viewer-mode-store';
import { useIsClosedSource } from '@/code/stores/closed-source-store';
import WorkspaceAutoHideButton, { WorkspaceCollapseButton } from '@/editor/WorkspaceAutoHideButton';
import { LogoButton } from '@/editor/header/LeftHeader';

function SettingsGearIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.35" />
      <path d="M8 1.5v1.65M8 12.85v1.65M1.5 8h1.65M12.85 8h1.65M3.4 3.4l1.17 1.17M11.43 11.43l1.17 1.17M12.6 3.4l-1.17 1.17M4.57 11.43 3.4 12.6" />
      <circle cx="8" cy="8" r="5.15" opacity=".55" />
    </svg>
  );
}

// ─── Code Icon ──────────────────────────────────────────────────────────────

function CodeIcon({ className }: { className?: string }) {
  return <FigmaCodeIcon className={className} size={16} />;
}

// ─── Layers Icon (3 horizontal stacked sheets) ──────────────────────────────
//
// User-supplied glyph — three diamond layers stacked vertically, signalling
// the layer tree more conventionally than the offset-cards icon used
// before. `currentColor` lets the active/inactive theme split work the
// same way the other left-menu icons do.
function LayersIcon({ className }: { className?: string }) {
  return <FigmaLayersIcon className={className} size={16} />;
}

// ─── Hover-tooltip helpers ──────────────────────────────────────────────────
//
// Centralised state for the floating "section name" tooltip that pops to
// the right of an icon on hover. Click-to-suppress semantics: clicking an
// icon hides its tooltip until the user mouseenters a DIFFERENT icon
// (mouseenter on the same icon while suppressed stays silent). Without
// the suppression, the tooltip stayed visible after click and lingered
// over the panel that just opened.
type TooltipState = { label: string; top: number; left: number };

interface TooltipHandlers {
  /** mouseenter handler — pass the element ref so we can read its rect. */
  onEnter: (key: string, label: string, btn: HTMLElement) => void;
  /** mouseleave handler — clears the tooltip. */
  onLeave: () => void;
  /** call after the button's own click action runs, with the icon's key. */
  onClick: (key: string) => void;
  /** current suppression — read by Enter handler to skip showing. */
  suppressedKey: string | null;
}

// ─── Menu Button ────────────────────────────────────────────────────────────

interface MenuButtonProps {
  panelId: Exclude<LeftPanelId, null>;
  isActive: boolean;
  onToggle: (id: Exclude<LeftPanelId, null>) => void;
  title: string;
  tooltip: TooltipHandlers;
  children: React.ReactNode;
  /** Viewer mode — non-interactive + dimmed. Pages / Layers stay
   *  enabled so a viewer can still navigate; everything else passes
   *  `disabled` so it reads as available-with-edit-access. */
  disabled?: boolean;
  /** Optional `data-tutorial` id — lets the onboarding tour anchor a
   *  highlight to this icon button. */
  dataTutorial?: string;
}

const RAIL_GLYPH_BEHAVIOR: Partial<Record<Exclude<LeftPanelId, null>, FieldGlyphBehavior>> = {
  layers: 'layers', library: 'stack', presets: 'presets', media: 'media',
  locale: 'globe', cms: 'stack', branches: 'branch',
};

const MenuButton = React.memo(function MenuButton({
  panelId, isActive, onToggle, title, tooltip, children, disabled, dataTutorial,
}: MenuButtonProps) {
  return (
    <motion.button
      disabled={disabled}
      data-tutorial={dataTutorial}
      initial="rest"
      whileHover={!disabled ? 'hover' : undefined}
      whileTap={!disabled ? 'tap' : undefined}
      onClick={disabled ? undefined : (e) => {
        onToggle(panelId);
        tooltip.onClick(panelId);
        // Blur so the focus ring + lingering :hover state don't keep the
        // tooltip-anchor button "active" after the click closes the
        // tooltip.
        e.currentTarget.blur();
      }}
      onMouseEnter={disabled ? undefined : (e) => tooltip.onEnter(panelId, title, e.currentTarget)}
      onMouseLeave={disabled ? undefined : tooltip.onLeave}
      // Native browser tooltip removed — we draw our own. Without this,
      // the browser's grey title-bubble fights ours on slow systems.
      className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-colors ${
        disabled
          ? 'text-[var(--text-secondary)] opacity-40 cursor-not-allowed'
          : isActive
            ? 'bg-[var(--rail-active-bg)] text-[var(--rail-active-fg)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      <FieldGlyph behavior={RAIL_GLYPH_BEHAVIOR[panelId] ?? 'generic'}>{children}</FieldGlyph>
    </motion.button>
  );
});

// ─── LeftMenu ───────────────────────────────────────────────────────────────

export default function LeftMenu() {
  const activePanel = useAtomValue(leftPanelAtom);
  const workspaceMode = useAtomValue(workspaceModeAtom);
  const setWorkspaceMode = useSetAtom(setWorkspaceModeAtom);
  const railVisible = useAtomValue(leftRailVisibleAtom);
  const setFloatingLeftHidden = useSetAtom(floatingLeftHiddenAtom);
  const [floatingPanelCollapsed, setFloatingPanelCollapsed] = useAtom(floatingPanelCollapsedAtom);
  const setCompactPanelOpen = useSetAtom(compactPanelOpenAtom);
  const compactPanelOpen = useAtomValue(compactPanelOpenAtom);
  const [leftPaneOpen, setLeftPaneOpen] = useAtom(leftPaneOpenAtom);
  const leftDetached = useAtomValue(detachedLeftPanelAtom);
  const setLeftDetached = useSetAtom(detachedLeftPanelAtom);
  const collapsedWidth = useAtomValue(leftCollapsedWidthAtom);
  const floatingLeftHeight = useAtomValue(floatingLeftHeightAtom);
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);
  const setSettingsOpen = useSetAtom(settingsOverlayOpenAtom);
  const setSettingsSection = useSetAtom(settingsSectionAtom);
  const workspace = deriveWorkspaceLayout(leftPaneOpen, rightPaneOpen);
  const [codeOpen, setCodeOpen] = useAtom(codeEditorOpenAtom);
  // Viewer mode — only Pages + Layers stay interactive (navigation /
  // inspection). VIBE, Insert, Library, Presets, Media, Locale, CMS,
  // Code, Templates are all disabled (visible-but-dimmed, consistent
  // with the rest of view-only chrome).
  const isViewer = useIsViewer();
  // VIBE and Code key on the ROLE alone: while an agent run locks the branch
  // the editor is read-only (viewer reason `agent`), but the chat is where
  // that run is watched and stopped, and reading the code stays useful (the
  // editor's Write toggle is gated on the run separately).
  const isViewerRole = useIsViewerRole();
  const agentRunning = useAtomValue(agentStatusAtom) === 'running';
  const isClosedSource = useIsClosedSource();
  // The VIBE icon opens the docked AI chat. It hides entirely while the chat
  // is detached into the floating popup — there's nothing for it to toggle,
  // and the popup's X is what re-docks it.
  const detached = useAtomValue(aiChatDetachedAtom);
  // Code-component / plugin overlays — and the CMS editor overlay — take
  // over the workspace and host their own surface. The docked VIBE panel's
  // chat is gated off there, so it would render as an empty column. Hide
  // the VIBE icon while any overlay is open, and if VIBE is the active
  // panel fall back to Pages.
  const componentEditorOpen = useAtomValue(componentEditorFileAtom) !== null;
  const pluginEditorOpen = useAtomValue(pluginEditorFileAtom) !== null;
  const cmsEditorOpen = useAtomValue(cmsEditorOpenAtom);
  const inOverlay = componentEditorOpen || pluginEditorOpen || cmsEditorOpen;
  const setLeftPanel = useSetAtom(leftPanelAtom);
  const openRailPanel = useCallback((id: Exclude<LeftPanelId, null>) => {
    if (activePanel === id && id !== 'vibe') {
      if (workspaceMode === 'floating') { setFloatingPanelCollapsed(!floatingPanelCollapsed); return; }
      if (workspaceMode === 'compact') { setCompactPanelOpen(!compactPanelOpen); return; }
      if (workspaceMode === 'compact-docked' || workspaceMode === 'docked') { setLeftPaneOpen(!leftPaneOpen); return; }
    }
    setLeftPanel(id);
    if (workspaceMode === 'compact' && id !== 'vibe') {
      setCompactPanelOpen(true);
    } else if (workspaceMode === 'compact-docked' && id !== 'vibe') {
      setLeftPaneOpen(true);
    } else if (workspaceMode === 'docked' && id !== 'vibe') {
      setLeftPaneOpen(true);
    } else if (workspaceMode === 'floating' && id !== 'vibe') {
      setLeftDetached({ panelId: id, expanded: true });
      setFloatingLeftHidden(false);
      setFloatingPanelCollapsed(false);
    } else if (workspaceMode !== 'docked') {
      setWorkspaceMode('docked');
    }
  }, [activePanel, compactPanelOpen, floatingPanelCollapsed, leftPaneOpen, setCompactPanelOpen, setFloatingLeftHidden, setFloatingPanelCollapsed, setLeftDetached, setLeftPaneOpen, setLeftPanel, setWorkspaceMode, workspaceMode]);
  useEffect(() => {
    if (inOverlay && activePanel === 'vibe') setLeftPanel(DEFAULT_LEFT_PANEL);
  }, [inOverlay, activePanel, setLeftPanel]);

  // ─── Tooltip state — hover-to-show, click-to-suppress ─────────────────
  // `tooltip` is the currently visible label + its anchor coords. Null
  // means nothing's shown. `suppressedKey` is the icon ID that the user
  // just clicked — its tooltip stays hidden until the user mouseenters a
  // DIFFERENT icon (suppression clears at that point so the second hover
  // back onto the clicked icon shows the tooltip again).
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [suppressedKey, setSuppressedKey] = useState<string | null>(null);
  // Refs hold the latest values so the memoised handlers below stay
  // stable identity-wise (matters because `MenuButton` is `React.memo`'d
  // — a new handler object every render would defeat that memoisation).
  const suppressedRef = useRef<string | null>(null);
  suppressedRef.current = suppressedKey;

  const handleEnter = useCallback((key: string, label: string, btn: HTMLElement) => {
    // Re-entering the suppressed icon: keep tooltip hidden. Re-entering
    // anything else clears the suppression flag so subsequent hovers
    // (including a return to the previously-clicked icon) work as
    // expected.
    if (key === suppressedRef.current) {
      setTooltip(null);
      return;
    }
    if (suppressedRef.current !== null) setSuppressedKey(null);
    const rect = btn.getBoundingClientRect();
    setTooltip({
      label,
      top: rect.top + rect.height / 2,
      // Sits well clear of the icon strip — 20 px gap reads as a
      // floating chip in the gutter between LeftMenu and LeftPanel,
      // not a label hugging the button edge. LeftPanel starts at
      // x=52 so the tooltip lands in the visible margin between the
      // strip and the panel's left border.
      left: rect.right + 8,
    });
  }, []);
  const handleLeave = useCallback(() => setTooltip(null), []);
  const handleClick = useCallback((key: string) => {
    // Click hides the tooltip AND marks this icon's tooltip suppressed
    // until the next mouseenter on a different icon (see `handleEnter`).
    setTooltip(null);
    setSuppressedKey(key);
  }, []);
  const tooltipHandlers: TooltipHandlers = {
    onEnter: handleEnter,
    onLeave: handleLeave,
    onClick: handleClick,
    suppressedKey,
  };

  const sharedMode = workspaceMode === 'docked' || workspaceMode === 'floating' || workspaceMode === 'compact-docked';
  const dockedShell = workspaceMode === 'docked' || workspaceMode === 'compact-docked';
  const panelCollapsed = workspaceMode === 'floating' ? floatingPanelCollapsed : !leftPaneOpen;
  const togglePanelCollapsed = () => {
    if (workspaceMode === 'floating') { setFloatingPanelCollapsed(!floatingPanelCollapsed); return; }
    setLeftPaneOpen(!leftPaneOpen);
  };
  return (
    <>
    <div
      data-left-menu-rail
      data-visible={railVisible ? 'true' : 'false'}
      data-workspace-mode={leftPaneOpen ? 'docked' : leftDetached ? 'floating' : 'collapsed'}
      aria-hidden={!railVisible}
      inert={!railVisible}
      className="w-[52px] fixed z-[5000] flex flex-col justify-start items-center px-[13px]"
      // willChange/isolation: own compositor layer — see LeftPanel (grey
      // checkerboard under the zoom-out re-raster burst).
      style={{ left: dockedShell ? 0 : WORKSPACE_FLOAT_INSET, top: dockedShell ? 0 : WORKSPACE_FLOAT_LEFT_TOP, width: dockedShell ? 52 : collapsedWidth, height: dockedShell ? '100vh' : workspaceMode === 'floating' ? `calc(100vh - ${WORKSPACE_FLOAT_LEFT_TOP + WORKSPACE_FLOAT_INSET}px)` : Math.min(floatingLeftHeight, window.innerHeight - WORKSPACE_FLOAT_LEFT_TOP - WORKSPACE_FLOAT_INSET), backgroundColor: 'var(--bg-left-rail)', borderTopLeftRadius: dockedShell ? 0 : 8, borderBottomLeftRadius: dockedShell ? 0 : 8, borderTopRightRadius: dockedShell ? 0 : (workspaceMode === 'compact' ? !compactPanelOpen : floatingPanelCollapsed) ? 8 : 0, borderBottomRightRadius: dockedShell ? 0 : (workspaceMode === 'compact' ? !compactPanelOpen : floatingPanelCollapsed) ? 8 : 0, willChange: 'transform', isolation: 'isolate', paddingTop: dockedShell ? 0 : 10, opacity: railVisible ? 1 : 0, transform: railVisible ? 'translateX(0)' : 'translateX(-18px)', transition: 'transform 260ms ease, opacity 260ms ease, border-radius 260ms ease' }}
    >
      {dockedShell && <div className="flex h-[52px] w-full shrink-0 items-center justify-center"><LogoButton /></div>}
      {/* Right border */}
      <div className="absolute right-0 top-4 bottom-0 w-px bg-[var(--border-light)]" />

      {sharedMode && railVisible && (
        <div data-left-rail-bottom-controls className="absolute bottom-3 left-0 right-0 z-10 flex flex-col items-center">
          <WorkspaceAutoHideButton side="left" />
          <div className="mt-2">
            <WorkspaceCollapseButton side="left" collapsed={panelCollapsed} onClick={togglePanelCollapsed} />
          </div>
          <div className="mt-6 flex flex-col items-center gap-2">
            <EditorAppearanceControl />
            <button
              type="button"
              data-left-rail-settings
              aria-label="Open General settings"
              title="General settings"
              disabled={isViewer}
              onClick={() => {
                if (isViewer) return;
                setSettingsSection('website');
                setSettingsOpen(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-[5px] text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SettingsGearIcon />
            </button>
          </div>
        </div>
      )}

      {/* Top section */}
      <div className="flex min-h-0 flex-1 w-full items-center flex-col gap-2 relative z-10 overflow-y-auto scrollbar-hide pb-40">
        {/* Vibe AI — brand accent. Opens the docked AI chat panel. Hidden while the
            chat is detached into its floating popup OR a code / plugin
            overlay is open; scales + slides in/out (and collapses its row
            height) on those transitions. `initial={false}` skips the
            animation on first app load. */}
        <AnimatePresence initial={false}>
          {!detached && !inOverlay && (
            <motion.div
              key="vibe-menu-item"
              initial={{ opacity: 0, scale: 0.6, x: -8, height: 0, marginBottom: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0, height: 'auto', marginBottom: 0 }}
              exit={{ opacity: 0, scale: 0.6, x: -8, height: 0, marginBottom: -8 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.28 }}
              className="flex flex-col items-center gap-2 overflow-hidden"
            >
              {/* The provider-neutral AI glyph sits inside the existing agent
                  activity ring; the motion still reports a running turn. */}
              <div className={`vibe-ring relative w-8 h-8 rounded-[6px] ${agentRunning ? 'vibe-working' : ''}`} data-testid="vibe-button" data-working={agentRunning || undefined}>
                <button
                  aria-label="AI assistant"
                  disabled={isViewerRole}
                  onClick={isViewerRole ? undefined : (e) => { openRailPanel('vibe'); handleClick('vibe'); e.currentTarget.blur(); }}
                  onMouseEnter={isViewerRole ? undefined : (e) => handleEnter('vibe', 'AI assistant', e.currentTarget)}
                  onMouseLeave={isViewerRole ? undefined : handleLeave}
                  className={`vibe-face absolute inset-0 rounded-[6px] flex items-center justify-center transition-colors text-[10px] font-bold tracking-wide ${
                    isViewerRole
                      ? 'text-[var(--text-secondary)] opacity-40 cursor-not-allowed'
                      : leftPaneOpen && activePanel === 'vibe'
                        ? 'bg-[var(--rail-active-bg)] text-[var(--rail-active-fg)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="vibe-text relative"><FieldGlyph behavior="generic"><SettingsConnectAiIcon size={17} /></FieldGlyph></span>
                </button>
              </div>

              {/* Separator */}
              <div className="w-5 h-px bg-[var(--border-light)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insert — accent (Minimal UI: was hardcoded green) */}
        <motion.button
          data-left-menu-item="insert"
          initial="rest"
          whileHover={!isViewer ? 'hover' : undefined}
          whileTap={!isViewer ? 'tap' : undefined}
          data-tutorial="insert-button"
          disabled={isViewer}
          onClick={isViewer ? undefined : (e) => { openRailPanel('insert'); handleClick('insert'); e.currentTarget.blur(); }}
          onMouseEnter={isViewer ? undefined : (e) => handleEnter('insert', 'Insert', e.currentTarget)}
          onMouseLeave={isViewer ? undefined : handleLeave}
          className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-colors ${
            isViewer
              ? 'text-[var(--text-secondary)] opacity-40 cursor-not-allowed'
              : activePanel === 'insert'
                ? 'bg-[var(--rail-active-bg)] text-[var(--rail-active-fg)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FieldGlyph behavior="plus"><InsertPlusIcon className="w-4 h-4" /></FieldGlyph>
        </motion.button>

        {/* Pages & Layers — one persistent document panel. Pages stays above
            the layer tree, so the rail item opens/collapses the document pane
            without introducing a second navigation mode. Both legacy panel ids
            still count as active for restored state compatibility. */}
        <MenuButton panelId="layers" isActive={activePanel === 'pages-layers' || activePanel === 'layers'} onToggle={openRailPanel} title="Pages & Layers" tooltip={tooltipHandlers} dataTutorial="layers-button">
          <LayersIcon className="w-[18px] h-[18px]" />
        </MenuButton>

        {/* Library — its own entry, NOT a tab of the panel above: it is an
            insert surface (pick a thing, drop it on the canvas) rather than a
            way of navigating the current document. Enabled for viewers; the
            panel itself gates which sections they can click into. */}
        <MenuButton panelId="library" isActive={activePanel === 'library'} onToggle={openRailPanel} title="Library" tooltip={tooltipHandlers} dataTutorial="library-button">
          <LibraryStackIcon className="w-[18px] h-[18px]" size={18} />
        </MenuButton>


        {/* Presets */}
        <MenuButton panelId="presets" isActive={activePanel === 'presets'} onToggle={openRailPanel} title="Presets" tooltip={tooltipHandlers} disabled={isViewer} dataTutorial="presets-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="w-[18px] h-[18px]">
            <path fill="currentColor" d="M19 11.5s-2 2.17-2 3.5a2 2 0 0 0 2 2a2 2 0 0 0 2-2c0-1.33-2-3.5-2-3.5M5.21 10L10 5.21L14.79 10m1.77-1.06L7.62 0L6.21 1.41l2.38 2.38l-5.15 5.15c-.59.56-.59 1.53 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.59.59-1.56 0-2.12" />
          </svg>
        </MenuButton>

        {/* Media Gallery */}
        <MenuButton panelId="media" isActive={activePanel === 'media'} onToggle={openRailPanel} title="Media Gallery" tooltip={tooltipHandlers} disabled={isViewer} dataTutorial="media-button">
          <ChatImageIcon className="w-[18px] h-[18px]" />
        </MenuButton>

        {/* CMS */}
        <MenuButton panelId="cms" isActive={activePanel === 'cms'} onToggle={openRailPanel} title="CMS" tooltip={tooltipHandlers} disabled={isViewer} dataTutorial="cms-button">
          <CmsIcon className="w-[18px] h-[18px]" />
        </MenuButton>

        {/* Branches — parallel workspaces; main stays the publish truth. */}
        {/* Branches keys on the ROLE: while an agent run holds the branch the
            panel is where you see which one is in use (switching is refused
            with the reason until the run finishes). */}
        <MenuButton panelId="branches" isActive={activePanel === 'branches'} onToggle={openRailPanel} title="Branches" tooltip={tooltipHandlers} disabled={isViewerRole} dataTutorial="branches-button">
          <BranchIcon size={18} />
        </MenuButton>

        {/* Code — opens floating popup instead of left panel. HIDDEN
            entirely on a closed-source template remix: the template author
            chose not to expose the source, so the affordance doesn't render
            (matching the marketplace "Closed source" option). */}
        {!isClosedSource && <motion.button
          disabled={isViewerRole}
          initial="rest"
          whileHover={!isViewerRole ? 'hover' : undefined}
          whileTap={!isViewerRole ? 'tap' : undefined}
          onClick={isViewerRole ? undefined : (e) => { setCodeOpen(v => !v); handleClick('code'); e.currentTarget.blur(); }}
          onMouseEnter={isViewerRole ? undefined : (e) => handleEnter('code', 'Code', e.currentTarget)}
          onMouseLeave={isViewerRole ? undefined : handleLeave}
          className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-colors ${
            isViewerRole
              ? 'text-[var(--text-secondary)] opacity-40 cursor-not-allowed'
              : codeOpen
                ? 'bg-[var(--rail-active-bg)] text-[var(--rail-active-fg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <FieldGlyph behavior="code"><CodeIcon className="w-[18px] h-[18px]" /></FieldGlyph>
        </motion.button>}

      </div>

      {/* Floating tooltip — portaled to body so it overlays the LeftPanel
          (which sits above z-[5000]) and respects screen-edge clamping
          regardless of where the LeftMenu container stacks. Renders only
          when `tooltip` is set; click-suppression is handled upstream in
          `handleClick` / `handleEnter`.
          Animation: very subtle fade + scale + slight rightward slide on
          enter / exit. Starts a few px to the LEFT of its final position
          with 95 % scale and 0 opacity, then settles into place over
          120 ms (linear-ish ease). Reads as "the tooltip floated out
          from the icon" without any showy motion. `transform: 'none'`
          gets overridden by framer-motion's `style` prop — we keep the
          `translateY(-50%)` by baking it into the `y: '-50%'` initial /
          animate values so motion preserves the vertical centring. */}
      {createPortal(
        <AnimatePresence>
          {tooltip && (
            <motion.div
              key="left-menu-tooltip"
              initial={{ opacity: 0, scale: 0.92, x: -4, y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: 0, y: '-50%' }}
              exit={{ opacity: 0, scale: 0.92, x: -4, y: '-50%' }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="fixed rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-2 py-1 shadow-[var(--shadow-md)] text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap pointer-events-none"
              style={{
                top: tooltip.top,
                left: tooltip.left,
                zIndex: 10000,
                // Anchor the scale to the LEFT edge so the tooltip
                // "grows out" from the icon side rather than from its
                // own centre — reads more naturally with the rightward
                // slide on enter.
                transformOrigin: 'left center',
              }}
            >
              {tooltip.label}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
    </>
  );
}
