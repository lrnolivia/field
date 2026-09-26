// BottomToolbar.tsx — Floating bottom toolbar with tool modes, zoom, search, theme, comments.
// FIGUI3_BOTTOM_TOOLBAR_POLISH_20260925
// FIGUI3_BOTTOM_TOOLBAR_FIGMA_PARITY_20260926
// FIGUI3_TOOLBAR_RESOURCE_VIEW_CONTROLS_20260926
// FigUI3 true-float geometry: rounded island, quiet utility chrome, compact local menus.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useClickOutside } from './hooks/useClickOutside';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import { settingsOverlayOpenAtom, settingsSectionAtom, hasActiveSubscriptionAtom } from '@/code/stores/website-settings-store';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { toolModeAtom, panHighlightAtom, isShapeMode, isLayoutMode, type ToolMode } from '@/code/stores/tool-store';
import { zoomToFit, zoomToFitSelection } from '@/canvas/transform';
import { getContentRoot } from '@/canvas/node-ops';
import { selectedNodeAtom } from '@/code/stores/store';
import { activeFilePathAtom, isIconSetFilePath } from '@/code/project/active-file-store';
import { creatorToolsLockedAtom } from '@/code/stores/tool-store';
import { commentModeActiveAtom } from '@/code/stores/comment-store';
import {
  FigmaCursorIcon as CursorIcon,
  FigmaFrameIcon as FrameToolbarIcon,
  FigmaTextIcon as TextToolbarIcon,
  FigmaHandIcon as HandToolbarIcon,
  FigmaSquareIcon as ShapeSquareIcon,
  FigmaCircleIcon as ShapeCircleIcon,
  FigmaTriangleIcon as ShapeTriangleIcon,
  FigmaPathIcon as ShapePathIcon,
  FigmaRowsIcon as LayoutRowsIcon,
  FigmaColumnsIcon as LayoutColumnsIcon,
  FigmaGridIcon as LayoutGridIcon,
  FigmaLibraryIcon as ResourcesIcon,
  FigmaSearchIcon as SearchIcon,
  FigmaCommentIcon as CommentBubbleIcon,
  FigmaPencilIcon as SketchPencilIcon,
  FigmaChevronDownIcon,
  FigmaCheckIcon,
} from '@/shared/loew-figma-icons';
import { usePaletteToggle } from '@/editor/command-palette/CommandPalette';
import { trace } from '@/shared/debug-trace';
import { useIsViewer, useIsOffline } from '@/code/stores/viewer-mode-store';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { leftPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { ChatImageIcon } from '@/shared/icons';

// ─── Chevron & Check icons ─────────────────────────────────────────────────

const ChevronDownSvg = () => <FigmaChevronDownIcon size={12} />;
const CheckSvg = () => <FigmaCheckIcon size={14} />;

// ─── Shared sub-components ──────────────────────────────────────────────────

function Separator() {
  return <div className="w-px h-[20px] bg-[var(--border-light)] mx-0.5 shrink-0" />;
}

function ShortcutHint({ text }: { text: string }) {
  return <span className="text-[11px] text-[var(--text-tertiary)] ml-auto pl-4">{text}</span>;
}

function MenuItem({ label, shortcut, icon, active, onClick, disabled }: {
  label: string; shortcut?: string; icon?: React.ReactNode; active?: boolean;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`flex items-center w-full px-2.5 py-1.5 text-xs rounded-[5px] transition-colors gap-2 bg-transparent ${
        disabled
          ? 'text-[var(--text-disabled)] cursor-not-allowed opacity-50'
          : 'text-[var(--text-primary)] hover:bg-[var(--btn-secondary-bg)] cursor-pointer'
      }`}
      style={{ border: 'none', fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'left' }}
    >
      <span className="w-4 h-4 flex items-center justify-center shrink-0">
        {active ? <CheckSvg /> : icon ?? null}
      </span>
      <span>{label}</span>
      {shortcut && <ShortcutHint text={shortcut} />}
    </button>
  );
}

function DropdownContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[180px] rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-[var(--shadow-lg)] p-1 z-[100]">
      {children}
    </div>
  );
}

function DropdownDivider() {
  return <div className="h-px bg-[var(--border-light)] my-1" />;
}

// ─── Split Button (icon + chevron) ──────────────────────────────────────────

function SplitButton({ active, icon, onClick, onChevronClick, title, dataTool }: {
  active: boolean; icon: React.ReactNode; onClick: () => void;
  onChevronClick: () => void; title: string; dataTool?: string;
}) {
  return (
    <div className="flex items-center">
      <button
        onClick={onClick}
        title={title}
        data-toolbar-tool={dataTool}
        aria-pressed={active || undefined}
        className={`flex items-center justify-center w-[36px] h-[36px] rounded-[6px] transition-colors ${
          active
            ? 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
        }`}
        style={{ border: 'none', cursor: 'pointer' }}
      >
        {icon}
      </button>
      {/* The chevron sits on the TOOLBAR surface, not on the accent pill —
          so its active color must be --accent (visible on the surface by
          definition), never --accent-fg (invisible on themes whose accent
          is light: accent-fg is dark-on-dark there). */}
      <button
        onClick={onChevronClick}
        className={`flex items-center justify-center w-[12px] h-[36px] transition-colors ${
          active
            ? 'text-[var(--accent)] opacity-80 hover:opacity-100'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-[5px]'
        }`}
        // Keep the narrow chevron hit target optically subordinate to the main tool.
        style={{ border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
      >
        <ChevronDownSvg />
      </button>
    </div>
  );
}

// ─── Tool Button (simple) ───────────────────────────────────────────────────

function ToolButton({ active, onClick, title, children, dataTutorial, dataTool, compact = false }: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode;
  dataTutorial?: string; dataTool?: string; compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      data-tutorial={dataTutorial}
      data-toolbar-tool={dataTool}
      aria-pressed={active || undefined}
      className={`flex items-center justify-center ${compact ? 'w-[32px] h-[32px]' : 'w-[36px] h-[36px]'} rounded-[6px] transition-colors ${
        active
          ? 'bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      }`}
      style={{ border: 'none', cursor: 'pointer' }}
    >
      {children}
    </button>
  );
}

/** Greys + inerts a creator control while a translation is being edited. */
function CreatorGate({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <div
      className="flex items-center opacity-40"
      style={{ pointerEvents: 'none' }}
      aria-disabled="true"
      title="Creating elements is disabled while editing a translation"
      data-creator-locked
    >
      {children}
    </div>
  );
}

// ─── Cursor Dropdown ────────────────────────────────────────────────────────

function CursorDropdown({ toolMode, commentModeActive, onSelect }: {
  toolMode: ToolMode; commentModeActive: boolean; onSelect: (m: ToolMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Comment mode forces toolMode to 'select' under the hood, but it's a
  // separate tool from the user's POV — so the cursor button must read
  // as inactive while comment mode owns the canvas.
  const isActive = (toolMode === 'select' || toolMode === 'hand') && !commentModeActive;
  // Spacebar hand: while space is held (panHighlightAtom — set on keydown,
  // cleared on keyup, same signal the canvas cursor uses) the canvas IS the
  // hand tool, so the toolbar shows the hand icon for the hold, like the
  // dropdown's Hand entry (user request 2026-08-27).
  const spaceHand = useAtomValue(panHighlightAtom);

  useClickOutside(ref, open, () => setOpen(false));

  const currentIcon = toolMode === 'hand' || spaceHand
    ? <HandToolbarIcon className="w-4 h-4" />
    : <CursorIcon className="w-4 h-4 translate-y-0.5" />;

  return (
    <div className="relative" ref={ref}>
      <SplitButton
        active={isActive || open}
        icon={currentIcon}
        onClick={() => onSelect(toolMode === 'hand' ? 'hand' : 'select')}
        onChevronClick={() => setOpen(!open)}
        title="Select (V) / Hand (H)"
        dataTool="select"
      />
      {open && (
        <DropdownContainer>
          <MenuItem label="Move" shortcut="V" active={toolMode === 'select'} onClick={() => { onSelect('select'); setOpen(false); }} />
          <MenuItem label="Hand tool" shortcut="H" active={toolMode === 'hand'} icon={<div className="w-4 h-4" />} onClick={() => { onSelect('hand'); setOpen(false); }} />
        </DropdownContainer>
      )}
    </div>
  );
}

// ─── Shape Dropdown ─────────────────────────────────────────────────────────

// Vector-shape split button. Sketch has its own Figma-like toolbar slot.
function ShapeDropdown({ active, onSelect }: {
  active: boolean; onSelect: (shape: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [currentShape, setCurrentShape] = useState('triangle');
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, open, () => setOpen(false));

  const shapeIcons: Record<string, React.ReactNode> = {
    square: <ShapeSquareIcon className="w-4 h-4" size={16} />,
    circle: <ShapeCircleIcon className="w-4 h-4" size={16} />,
    triangle: <ShapeTriangleIcon className="w-4 h-4" size={16} />,
    path: <ShapePathIcon className="w-4 h-4" size={16} />,
  };

  return (
    <div className="relative" ref={ref} data-tutorial="shape-tool">
      <SplitButton
        active={active || open}
        icon={shapeIcons[currentShape]}
        onClick={() => { onSelect(currentShape); }}
        onChevronClick={() => setOpen(!open)}
        title="Shapes"
        dataTool="shape"
      />
      {open && (
        <DropdownContainer>
          <MenuItem label="Square" shortcut="R" active={active && currentShape === 'square'} icon={<ShapeSquareIcon className="w-4 h-4" size={16} />} onClick={() => { setCurrentShape('square'); onSelect('square'); setOpen(false); }} />
          <MenuItem label="Circle" shortcut="O" active={active && currentShape === 'circle'} icon={<ShapeCircleIcon className="w-4 h-4" size={16} />} onClick={() => { setCurrentShape('circle'); onSelect('circle'); setOpen(false); }} />
          <MenuItem label="Triangle" shortcut="Shift+T" active={active && currentShape === 'triangle'} icon={<ShapeTriangleIcon className="w-4 h-4" size={16} />} onClick={() => { setCurrentShape('triangle'); onSelect('triangle'); setOpen(false); }} />
          <MenuItem label="Path" shortcut="P" active={active && currentShape === 'path'} icon={<ShapePathIcon className="w-4 h-4" size={16} />} onClick={() => { setCurrentShape('path'); onSelect('path'); setOpen(false); }} />
        </DropdownContainer>
      )}
    </div>
  );
}

// ─── Layout Dropdown ────────────────────────────────────────────────────────

function LayoutDropdown({ toolMode, onSelect }: { toolMode: ToolMode; onSelect: (layout: string) => void }) {
  const [open, setOpen] = useState(false);
  // Last layout the user chose — what the split button activates by default.
  // Synced from toolMode so re-selecting the dropdown shows the latest pick.
  const [lastLayout, setLastLayout] = useState<'rows' | 'columns' | 'grids'>('rows');
  const ref = useRef<HTMLDivElement>(null);

  // Keep lastLayout in sync with toolMode (e.g. when activated via shortcut)
  useEffect(() => {
    if (toolMode === 'layout-rows') setLastLayout('rows');
    else if (toolMode === 'layout-columns') setLastLayout('columns');
    else if (toolMode === 'layout-grids') setLastLayout('grids');
  }, [toolMode]);

  useClickOutside(ref, open, () => setOpen(false));

  const active = isLayoutMode(toolMode);
  const currentLayout: 'rows' | 'columns' | 'grids' = active
    ? (toolMode === 'layout-rows' ? 'rows' : toolMode === 'layout-columns' ? 'columns' : 'grids')
    : lastLayout;

  const layoutIcons: Record<string, React.ReactNode> = {
    rows: <LayoutRowsIcon className="w-4 h-4" size={16} />,
    columns: <LayoutColumnsIcon className="w-4 h-4" size={16} />,
    grids: <LayoutGridIcon className="w-4 h-4" size={16} />,
  };

  return (
    <div className="relative" ref={ref}>
      <SplitButton
        active={active || open}
        icon={layoutIcons[currentLayout]}
        onClick={() => { onSelect(currentLayout); }}
        onChevronClick={() => setOpen(!open)}
        title="Layout"
        dataTool="layout"
      />
      {open && (
        <DropdownContainer>
          <MenuItem label="Rows" shortcut="Shift+R" active={active && currentLayout === 'rows'} icon={<LayoutRowsIcon className="w-4 h-4" size={16} />} onClick={() => { setLastLayout('rows'); onSelect('rows'); setOpen(false); }} />
          <MenuItem label="Columns" shortcut="Shift+C" active={active && currentLayout === 'columns'} icon={<LayoutColumnsIcon className="w-4 h-4" size={16} />} onClick={() => { setLastLayout('columns'); onSelect('columns'); setOpen(false); }} />
          <MenuItem label="Grids" shortcut="Shift+G" active={active && currentLayout === 'grids'} icon={<LayoutGridIcon className="w-4 h-4" size={16} />} onClick={() => { setLastLayout('grids'); onSelect('grids'); setOpen(false); }} />
        </DropdownContainer>
      )}
    </div>
  );
}

// ─── Smart Zoom ─────────────────────────────────────────────────────────────

function SmartZoomButton({ selectedId }: { selectedId: string | null }) {
  const fit = useCallback(() => {
    const root = getContentRoot();
    if (!root) return;
    if (selectedId) {
      zoomToFitSelection(root, [selectedId]);
      trace.action('toolbar:smart-zoom', { target: 'selection', selectedId });
    } else {
      zoomToFit(root);
      trace.action('toolbar:smart-zoom', { target: 'canvas' });
    }
  }, [selectedId]);

  const title = selectedId ? 'Fit selection (Shift+2)' : 'Fit canvas (Shift+1)';
  return (
    <button
      type="button"
      data-toolbar-tool="smart-zoom"
      aria-label={title}
      title={title}
      onClick={fit}
      className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] border border-transparent text-[var(--text-secondary)] transition-colors hover:bg-[var(--control-bg-hover)] hover:text-[var(--text-primary)]"
      style={{ cursor: 'pointer' }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
        <path d="M5.25 2.5H2.5v2.75M10.75 2.5h2.75v2.75M13.5 10.75v2.75h-2.75M5.25 13.5H2.5v-2.75" />
        <circle cx="8" cy="8" r="1.4" />
      </svg>
    </button>
  );
}

// ─── Resources ──────────────────────────────────────────────────────────────

function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const setLeftPanel = useSetAtom(leftPanelAtom);
  const setLeftPaneOpen = useSetAtom(leftPaneOpenAtom);

  useClickOutside(ref, open, () => setOpen(false));

  const openCanonicalPanel = useCallback((panel: 'library' | 'media') => {
    setLeftPanel(panel);
    setLeftPaneOpen(true);
    setOpen(false);
    trace.action('toolbar:resources-open', { panel });
  }, [setLeftPanel, setLeftPaneOpen]);

  return (
    <div className="relative" ref={ref} data-toolbar-resources>
      <ToolButton
        active={open}
        onClick={() => setOpen((value) => !value)}
        title="Resources"
        dataTool="resources"
      >
        <ResourcesIcon className="w-4 h-4" size={16} />
      </ToolButton>
      {open && (
        <DropdownContainer>
          <MenuItem
            label="Components"
            icon={<ResourcesIcon className="w-4 h-4" size={16} />}
            onClick={() => openCanonicalPanel('library')}
          />
          <MenuItem
            label="Media gallery"
            icon={<ChatImageIcon className="w-4 h-4" />}
            onClick={() => openCanonicalPanel('media')}
          />
        </DropdownContainer>
      )}
    </div>
  );
}

// ─── Main BottomToolbar ─────────────────────────────────────────────────────

export default function BottomToolbar() {
  const [toolMode, setToolMode] = useAtom(toolModeAtom);
  // DIAGNOSTIC (temporary): when does the toolbar re-render, and what toolMode
  // does it see? Pairs with border-radius-handle:state to test whether the
  // tool-reset lands in a later (deferred) commit than the selection.
  trace.action('bottom-toolbar:render', { toolMode });
  const [commentModeActive, setCommentModeActive] = useAtom(commentModeActiveAtom);
  // Viewers get a stripped toolbar: smart zoom · comment.
  // Creator tools, Resources, and ⌘K search stay hidden for read-only seats.
  // Locale has its canonical left-rail home; Theme + full zoom live in the Inspector.
  //
  // The Upgrade pill lives at the right end of this bar (it briefly moved
  // to the logo menu's "Your Account" during the ui redesign — buried
  // there, nobody found it, so it's back as the distinct accent pill;
  // the menu entry remains as a secondary path).
  const isViewer = useIsViewer();
  const creatorLocked = useAtomValue(creatorToolsLockedAtom);
  const setSettingsOpen = useSetAtom(settingsOverlayOpenAtom);
  const setSettingsSection = useSetAtom(settingsSectionAtom);
  // Sites already on a paid, active plan don't need the Upgrade nudge —
  // it (and its separator) collapse out of the toolbar.
  const hasActiveSubscription = useAtomValue(hasActiveSubscriptionAtom);
  // Offline is a stricter case than role-viewer: a role-viewer MAY
  // comment, but an offline user may NOT (the comment can't be
  // persisted/synced), so the comment tool is hidden when offline.
  const isOffline = useIsOffline();
  const togglePalette = usePaletteToggle();
  const selectedId = useAtomValue(selectedNodeAtom);
  const activeFile = useAtomValue(activeFilePathAtom);
  const isIconSetMaster = isIconSetFilePath(activeFile);
  // Container-set (icon-set) masters suppress the
  // shared creators (Frame / Text / Layout). The kind-specific
  // tools stay visible:
  //   - icon-set master  → shape tools (rect / circle / triangle / path)
  const isContainerSetMaster = isIconSetMaster;
  const handleToolClick = useCallback((mode: ToolMode) => {
    trace.action('toolbar:tool-click', { mode });
    setToolMode(toolMode === mode && mode !== 'select' ? 'select' : mode);
    // Picking a creator tool exits comment mode (mutually exclusive,
    // mirrors the builder's behavior).
    if (commentModeActive) setCommentModeActive(false);
  }, [toolMode, setToolMode, commentModeActive, setCommentModeActive]);

  // Cursor / Hand selection — same as picking any tool, comment mode is
  // mutually exclusive so selecting the cursor exits it. Clicking the
  // cursor button while in comment mode is the user's "back to V".
  const handleSelectTool = useCallback((mode: ToolMode) => {
    trace.action('toolbar:select-tool', { mode });
    setToolMode(mode);
    if (commentModeActive) setCommentModeActive(false);
  }, [setToolMode, commentModeActive, setCommentModeActive]);

  const handleCommentClick = useCallback(() => {
    // Offline → commenting is unavailable (button hidden + this guard
    // covers the Ctrl+Alt+C shortcut, which routes through here).
    if (isOffline) return;
    const next = !commentModeActive;
    trace.action('toolbar:comment', { active: next });
    setCommentModeActive(next);
    // Entering comment mode forces select tool — the canvas needs to be
    // in a "do nothing on click" state so our own click handler can
    // place comments without competing with frame/text/shape creators.
    if (next && toolMode !== 'select') setToolMode('select');
  }, [isOffline, commentModeActive, setCommentModeActive, toolMode, setToolMode]);

  // Going offline force-exits comment mode — otherwise a thread left
  // open before the drop would keep the canvas-click placement handler
  // (in Comments.tsx) live even though the toolbar button is gone.
  useEffect(() => {
    if (isOffline && commentModeActive) setCommentModeActive(false);
  }, [isOffline, commentModeActive, setCommentModeActive]);

  // Ctrl+Alt+C → toggle comment mode (matches the builder shortcut).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.altKey) return;
      if (e.key.toLowerCase() !== 'c') return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      e.preventDefault();
      handleCommentClick();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCommentClick]);

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[9998] flex justify-center select-none"
      // CommandPalette measures the live bar rect, so anchored UI tracks it.
      style={{ bottom: 18, willChange: 'transform', isolation: 'isolate' }}
    >
      <div
        id="bottom-toolbar-container"
        className="relative flex items-center px-2 py-2 gap-0.5"
        // isolation: the cut backdrop below sits at z -1; isolating keeps it
        // inside this container instead of sliding under the page.
        style={{ isolation: 'isolate' }}
      >
        {/* True floating island: keep the shell on a separate backing layer so
            dropdowns can escape above the toolbar without being clipped. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-[11px] border border-[var(--border-light)]"
          // Same flat surface as ChromeIslands — the bar floats 18px off the
          // bottom edge as its own island.
          style={{
            // Minimal UI: flat opaque surface instead of glass.
            background: 'var(--bg-toolbar)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            boxShadow: 'var(--shadow-md)',
          } as React.CSSProperties}
        />
        {/* Figma-like authoring cluster. field-only creation tools stay here
            when the toolbar remains their clearest home. */}
        <div data-toolbar-cluster="authoring" className="flex items-center gap-0.5">
          <CursorDropdown toolMode={toolMode} commentModeActive={commentModeActive} onSelect={handleSelectTool} />

          {!isViewer && <>
            {!isContainerSetMaster && (
              <CreatorGate locked={creatorLocked}>
                <ToolButton
                  active={toolMode === 'frame'}
                  onClick={() => handleToolClick('frame')}
                  title="Draw Frame (F)"
                  dataTutorial="frame-tool"
                  dataTool="frame"
                >
                  <FrameToolbarIcon className="w-4 h-4" />
                </ToolButton>
              </CreatorGate>
            )}

            {isIconSetMaster ? (
              <>
                <ToolButton active={toolMode === 'shape-rect'} onClick={() => handleToolClick('shape-rect')} title="Square (R)" dataTool="shape-rect">
                  <ShapeSquareIcon className="w-4 h-4" size={16} />
                </ToolButton>
                <ToolButton active={toolMode === 'shape-ellipse'} onClick={() => handleToolClick('shape-ellipse')} title="Circle (O)" dataTool="shape-ellipse">
                  <ShapeCircleIcon className="w-4 h-4" size={16} />
                </ToolButton>
                <ToolButton active={toolMode === 'shape-triangle'} onClick={() => handleToolClick('shape-triangle')} title="Triangle (Shift+T)" dataTool="shape-triangle">
                  <ShapeTriangleIcon className="w-4 h-4" size={16} />
                </ToolButton>
                <ToolButton active={toolMode === 'shape-path'} onClick={() => handleToolClick('shape-path')} title="Path (P)" dataTool="shape-path">
                  <ShapePathIcon className="w-4 h-4" size={16} />
                </ToolButton>
              </>
            ) : (
              <CreatorGate locked={creatorLocked}>
                <ShapeDropdown
                  active={isShapeMode(toolMode)}
                  onSelect={(shape) => {
                    const shapeToMode: Record<string, ToolMode> = {
                      square: 'shape-rect',
                      circle: 'shape-ellipse',
                      triangle: 'shape-triangle',
                      path: 'shape-path',
                    };
                    const mode = shapeToMode[shape];
                    if (mode) {
                      trace.action('toolbar:shape', { shape, mode });
                      setToolMode(mode);
                    }
                  }}
                />
              </CreatorGate>
            )}

            <CreatorGate locked={creatorLocked}>
              <ToolButton
                active={toolMode === 'sketch'}
                onClick={() => handleToolClick('sketch')}
                title="Sketch (K)"
                dataTool="sketch"
              >
                <SketchPencilIcon className="w-4 h-4" size={16} />
              </ToolButton>
            </CreatorGate>

            {!isContainerSetMaster && (
              <CreatorGate locked={creatorLocked}>
                <ToolButton
                  active={toolMode === 'text'}
                  onClick={() => handleToolClick('text')}
                  title="Draw Text (T)"
                  dataTutorial="text-tool"
                  dataTool="text"
                >
                  <TextToolbarIcon className="w-4 h-4" />
                </ToolButton>
              </CreatorGate>
            )}

            {!isContainerSetMaster && (
              <CreatorGate locked={creatorLocked}>
                <ResourcesMenu />
              </CreatorGate>
            )}

            {!isContainerSetMaster && (
              <CreatorGate locked={creatorLocked}>
                <LayoutDropdown toolMode={toolMode} onSelect={(layout) => {
                  const layoutToMode: Record<string, ToolMode> = {
                    rows: 'layout-rows',
                    columns: 'layout-columns',
                    grids: 'layout-grids',
                  };
                  const mode = layoutToMode[layout];
                  if (mode) {
                    trace.action('toolbar:layout', { layout, mode });
                    setToolMode(toolMode === mode ? 'select' : mode);
                  }
                }} />
              </CreatorGate>
            )}
          </>}
        </div>

        <Separator />

        {/* Secondary utility cluster stays intentionally tiny: routine fit,
            command search, comments, and account upgrade only. */}
        <div
          data-toolbar-cluster="utility"
          className="flex items-center gap-0.5 p-0.5 rounded-[8px] bg-[var(--control-bg)]"
        >
          <SmartZoomButton selectedId={selectedId} />

          {!isViewer && (
            <button
              title="Search (⌘K)"
              aria-label="Search (⌘K)"
              onClick={togglePalette}
              data-palette-toggle
              data-tutorial="search-tool"
              data-toolbar-tool="search"
              className="flex items-center justify-center w-[32px] h-[32px] rounded-[6px] border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--control-bg-hover)] transition-colors"
              style={{ cursor: 'pointer' }}
            >
              <SearchIcon className="w-4 h-4" />
            </button>
          )}

          {!isOffline && (
            <ToolButton
              active={commentModeActive}
              onClick={handleCommentClick}
              title="Add Comment (Ctrl+Alt+C)"
              dataTutorial="comment-tool"
              dataTool="comment"
              compact
            >
              <CommentBubbleIcon className="w-4 h-4" />
            </ToolButton>
          )}

          {CLOUD_ENABLED && !isViewer && !hasActiveSubscription && (
            <button
              title="Upgrade plan"
              onClick={() => {
                trace.action('bottom-toolbar:upgrade');
                setSettingsSection('plans');
                setSettingsOpen(true);
              }}
              className="flex items-center justify-center h-[32px] px-2.5 rounded-[6px] transition-colors text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--bg-hover)]"
              style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)', cursor: 'pointer', border: 'none' }}
            >
              Upgrade
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inline zoom SVGs ───────────────────────────────────────────────────────

const ZoomOutSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomInSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);
