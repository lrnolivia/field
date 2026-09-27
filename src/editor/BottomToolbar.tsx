// BottomToolbar.tsx — Floating bottom toolbar with tool modes, zoom, search, theme, comments.
// FIGUI3_BOTTOM_TOOLBAR_POLISH_20260925
// FIGUI3_BOTTOM_TOOLBAR_FIGMA_PARITY_20260926
// FIGUI3_TOOLBAR_RESOURCE_VIEW_CONTROLS_20260926
// FIGUI3_TOOLBAR_FIGMA_PASS_20260927
// FigUI3 true-float geometry: rounded island, quiet utility chrome, compact local menus.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useFieldReducedMotion } from '@/editor/motion';
import { useClickOutside } from './hooks/useClickOutside';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import { settingsOverlayOpenAtom, settingsSectionAtom, hasActiveSubscriptionAtom } from '@/code/stores/website-settings-store';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { toolModeAtom, panHighlightAtom, type ToolMode } from '@/code/stores/tool-store';
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
import './bottom-toolbar-glyphs.css';

// ─── Chevron & Check icons ─────────────────────────────────────────────────

const ChevronDownSvg = () => <FigmaChevronDownIcon size={12} />;
const CheckSvg = () => <FigmaCheckIcon size={14} />;
const ScaleToolbarIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.25 6.1V3.25H6.1" />
    <path d="M9.9 12.75h2.85V9.9" />
    <path d="M3.55 3.55l3.1 3.1M12.45 12.45l-3.1-3.1" />
  </svg>
);
const LineToolbarIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden>
    <path d="M3 13 13 3" />
  </svg>
);

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
      <span data-field-toolbar-check={active || undefined} className="w-4 h-4 flex items-center justify-center shrink-0" aria-hidden="true">
        <CheckSvg />
      </span>
      <span data-field-toolbar-glyph="menu" className="w-4 h-4 flex items-center justify-center shrink-0">{icon ?? null}</span>
      <span>{label}</span>
      {shortcut && <ShortcutHint text={shortcut} />}
    </button>
  );
}

function DropdownContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[200px] rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-[var(--shadow-lg)] p-1 z-[100]">
      {children}
    </div>
  );
}

function DropdownDivider() {
  return <div className="h-px bg-[var(--border-light)] my-1" />;
}

// ─── Split Button (icon + chevron) ──────────────────────────────────────────

function ChangingToolIcon({ iconKey, children }: { iconKey: string; children: React.ReactNode }) {
  const reducedMotion = useFieldReducedMotion();
  return (
    <span
      data-field-toolbar-glyph="tool-switch"
      aria-hidden="true"
      className="relative grid h-4 w-4 shrink-0 place-items-center overflow-visible"
      style={{ width: 16, height: 16, flex: '0 0 16px' }}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.span
          key={iconKey}
          layout={false}
          className="absolute inset-0 flex h-4 w-4 items-center justify-center"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: -28, scale: .78 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 28, scale: .78 }}
          transition={{ duration: reducedMotion ? 0 : .2, ease: [.2, .8, .2, 1] }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function SplitButton({ active, open = false, icon, iconKey, onClick, onChevronClick, title, dataTool }: {
  active: boolean; icon: React.ReactNode; onClick: () => void;
  onChevronClick: () => void; title: string; dataTool?: string; open?: boolean; iconKey?: string;
}) {
  return (
    <div className="flex items-center gap-px">
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
        {iconKey
          ? <ChangingToolIcon iconKey={iconKey}>{icon}</ChangingToolIcon>
          : <span data-field-toolbar-glyph={dataTool ?? 'generic'} className="inline-flex items-center justify-center">{icon}</span>}
      </button>
      {/* The chevron sits on the TOOLBAR surface, not on the accent pill —
          so its active color must be --accent (visible on the surface by
          definition), never --accent-fg (invisible on themes whose accent
          is light: accent-fg is dark-on-dark there). */}
      <button
        onClick={onChevronClick}
        data-toolbar-chevron-open={open || undefined}
        className={`flex items-center justify-center w-[20px] h-[36px] rounded-[6px] transition-colors ${
          active
            ? 'text-[var(--text-secondary)] bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
        }`}
        // Keep the narrow chevron hit target optically subordinate to the main tool.
        style={{ border: 'none', cursor: 'pointer' }}
      >
        <span data-field-toolbar-glyph="chevron" className="inline-flex items-center justify-center"><ChevronDownSvg /></span>
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
      <span data-field-toolbar-glyph={dataTool ?? 'generic'} className="inline-flex items-center justify-center">{children}</span>
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

function CursorDropdown({ toolMode, commentModeActive, onSelect, allowScale }: {
  toolMode: ToolMode; commentModeActive: boolean; onSelect: (m: ToolMode) => void; allowScale: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Comment mode forces toolMode to 'select' under the hood, but it's a
  // separate tool from the user's POV — so the cursor button must read
  // as inactive while comment mode owns the canvas.
  const isActive = (toolMode === 'select' || toolMode === 'hand' || toolMode === 'scale') && !commentModeActive;
  // Spacebar hand: while space is held (panHighlightAtom — set on keydown,
  // cleared on keyup, same signal the canvas cursor uses) the canvas IS the
  // hand tool, so the toolbar shows the hand icon for the hold, like the
  // dropdown's Hand entry (user request 2026-08-27).
  const spaceHand = useAtomValue(panHighlightAtom);

  useClickOutside(ref, open, () => setOpen(false));

  const currentIcon = toolMode === 'hand' || spaceHand
    ? <HandToolbarIcon className="w-4 h-4" />
    : toolMode === 'scale'
      ? <ScaleToolbarIcon className="w-4 h-4" />
      : <CursorIcon className="w-4 h-4 translate-y-0.5" />;

  return (
    <div className="relative" ref={ref}>
      <SplitButton
        active={isActive || open}
        open={open}
        iconKey={toolMode === 'hand' || spaceHand ? 'hand' : toolMode === 'scale' ? 'scale' : 'select'}
        icon={currentIcon}
        onClick={() => onSelect(toolMode === 'hand' ? 'hand' : toolMode === 'scale' ? 'scale' : 'select')}
        onChevronClick={() => setOpen(!open)}
        title="Move (V) / Hand (H) / Scale (K)"
        dataTool="select"
      />
      {open && (
        <DropdownContainer>
          <MenuItem label="Move" shortcut="V" active={toolMode === 'select'} icon={<CursorIcon className="w-4 h-4" />} onClick={() => { onSelect('select'); setOpen(false); }} />
          <MenuItem label="Hand tool" shortcut="H" active={toolMode === 'hand'} icon={<HandToolbarIcon className="w-4 h-4" />} onClick={() => { onSelect('hand'); setOpen(false); }} />
          {allowScale && <MenuItem label="Scale" shortcut="K" active={toolMode === 'scale'} icon={<ScaleToolbarIcon className="w-4 h-4" />} onClick={() => { onSelect('scale'); setOpen(false); }} />}
        </DropdownContainer>
      )}
    </div>
  );
}

// ─── Frame Dropdown ─────────────────────────────────────────────────────────

function FrameDropdown({ toolMode, onSelect }: { toolMode: ToolMode; onSelect: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const setLeftPanel = useSetAtom(leftPanelAtom);
  const setLeftPaneOpen = useSetAtom(leftPaneOpenAtom);
  useClickOutside(ref, open, () => setOpen(false));

  const openSectionLibrary = useCallback(() => {
    setLeftPanel('insert');
    setLeftPaneOpen(true);
    setOpen(false);
    trace.action('toolbar:section-library');
  }, [setLeftPanel, setLeftPaneOpen]);

  return (
    <div className="relative" ref={ref} data-tutorial="frame-tool">
      <SplitButton
        active={toolMode === 'frame' || open}
        open={open}
        icon={<FrameToolbarIcon className="w-4 h-4" />}
        onClick={onSelect}
        onChevronClick={() => setOpen((value) => !value)}
        title="Frame (F)"
        dataTool="frame"
      />
      {open && (
        <DropdownContainer>
          <MenuItem label="Frame" shortcut="F" active={toolMode === 'frame'} icon={<FrameToolbarIcon className="w-4 h-4" />} onClick={() => { onSelect(); setOpen(false); }} />
          <DropdownDivider />
          <MenuItem label="Section library…" icon={<LayoutRowsIcon className="w-4 h-4" size={16} />} onClick={openSectionLibrary} />
        </DropdownContainer>
      )}
    </div>
  );
}

// ─── Shape Dropdown ─────────────────────────────────────────────────────────

function ShapeDropdown({ toolMode, onSelect, onOpenMedia }: {
  toolMode: ToolMode;
  onSelect: (shape: 'rectangle' | 'line' | 'ellipse' | 'triangle') => void;
  onOpenMedia: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [lastShape, setLastShape] = useState<'rectangle' | 'line' | 'ellipse' | 'triangle'>('rectangle');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));

  useEffect(() => {
    if (toolMode === 'shape-rect') setLastShape('rectangle');
    else if (toolMode === 'shape-ellipse') setLastShape('ellipse');
    else if (toolMode === 'shape-triangle') setLastShape('triangle');
    else if (toolMode === 'shape-line') setLastShape('line');
  }, [toolMode]);

  const active = toolMode === 'shape-rect' || toolMode === 'shape-line' || toolMode === 'shape-ellipse' || toolMode === 'shape-triangle';
  const currentShape = active
    ? (toolMode === 'shape-rect' ? 'rectangle' : toolMode === 'shape-line' ? 'line' : toolMode === 'shape-ellipse' ? 'ellipse' : 'triangle')
    : lastShape;
  const shapeIcons: Record<typeof currentShape, React.ReactNode> = {
    rectangle: <ShapeSquareIcon className="w-4 h-4" size={16} />,
    ellipse: <ShapeCircleIcon className="w-4 h-4" size={16} />,
    triangle: <ShapeTriangleIcon className="w-4 h-4" size={16} />,
    line: <LineToolbarIcon className="w-4 h-4" />,
  };
  const choose = (shape: typeof currentShape) => {
    setLastShape(shape);
    onSelect(shape);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref} data-tutorial="shape-tool">
      <SplitButton
        active={active || open}
        open={open}
        iconKey={currentShape}
        icon={shapeIcons[currentShape]}
        onClick={() => onSelect(currentShape)}
        onChevronClick={() => setOpen((value) => !value)}
        title="Shape tools"
        dataTool="shape"
      />
      {open && (
        <DropdownContainer>
          <MenuItem label="Rectangle" shortcut="R" active={toolMode === 'shape-rect'} icon={<ShapeSquareIcon className="w-4 h-4" size={16} />} onClick={() => choose('rectangle')} />
          <MenuItem label="Line" shortcut="L" active={toolMode === 'shape-line'} icon={<LineToolbarIcon className="w-4 h-4" />} onClick={() => choose('line')} />
          <MenuItem label="Ellipse" shortcut="O" active={toolMode === 'shape-ellipse'} icon={<ShapeCircleIcon className="w-4 h-4" size={16} />} onClick={() => choose('ellipse')} />
          <MenuItem label="Triangle" shortcut="Shift+T" active={toolMode === 'shape-triangle'} icon={<ShapeTriangleIcon className="w-4 h-4" size={16} />} onClick={() => choose('triangle')} />
          <DropdownDivider />
          <MenuItem label="Image/video…" shortcut="⇧⌘K" icon={<ChatImageIcon className="w-4 h-4" />} onClick={() => { onOpenMedia(); setOpen(false); }} />
        </DropdownContainer>
      )}
    </div>
  );
}

// ─── Pen / Pencil Dropdown ──────────────────────────────────────────────────

function PenDropdown({ toolMode, onSelect }: { toolMode: ToolMode; onSelect: (mode: 'shape-path' | 'sketch') => void }) {
  const [open, setOpen] = useState(false);
  const [lastMode, setLastMode] = useState<'shape-path' | 'sketch'>('shape-path');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  useEffect(() => {
    if (toolMode === 'shape-path' || toolMode === 'sketch') setLastMode(toolMode);
  }, [toolMode]);
  const active = toolMode === 'shape-path' || toolMode === 'sketch';
  const current = active ? toolMode as 'shape-path' | 'sketch' : lastMode;
  const icon = current === 'sketch'
    ? <SketchPencilIcon className="w-4 h-4" size={16} />
    : <ShapePathIcon className="w-4 h-4" size={16} />;
  const choose = (mode: 'shape-path' | 'sketch') => {
    setLastMode(mode);
    onSelect(mode);
    setOpen(false);
  };
  return (
    <div className="relative" ref={ref}>
      <SplitButton
        active={active || open}
        open={open}
        iconKey={current}
        icon={icon}
        onClick={() => onSelect(current)}
        onChevronClick={() => setOpen((value) => !value)}
        title="Pen / Pencil"
        dataTool="pen"
      />
      {open && (
        <DropdownContainer>
          <MenuItem label="Pen" shortcut="P" active={toolMode === 'shape-path'} icon={<ShapePathIcon className="w-4 h-4" size={16} />} onClick={() => choose('shape-path')} />
          <MenuItem label="Pencil" shortcut="Shift+P" active={toolMode === 'sketch'} icon={<SketchPencilIcon className="w-4 h-4" size={16} />} onClick={() => choose('sketch')} />
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
      <span data-field-toolbar-glyph="smart-zoom" className="inline-flex items-center justify-center"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
        <path d="M5.25 2.5H2.5v2.75M10.75 2.5h2.75v2.75M13.5 10.75v2.75h-2.75M5.25 13.5H2.5v-2.75" />
        <circle cx="8" cy="8" r="1.4" />
      </svg></span>
    </button>
  );
}

// ─── Resources ──────────────────────────────────────────────────────────────

function ResourcesButton() {
  const setLeftPanel = useSetAtom(leftPanelAtom);
  const setLeftPaneOpen = useSetAtom(leftPaneOpenAtom);
  const openLibrary = useCallback(() => {
    setLeftPanel('library');
    setLeftPaneOpen(true);
    trace.action('toolbar:resources-open', { panel: 'library' });
  }, [setLeftPanel, setLeftPaneOpen]);
  return (
    <ToolButton onClick={openLibrary} title="Resources" dataTool="resources">
      <ResourcesIcon className="w-4 h-4" size={16} />
    </ToolButton>
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
  const setLeftPanel = useSetAtom(leftPanelAtom);
  const setLeftPaneOpen = useSetAtom(leftPaneOpenAtom);
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
        {/* Figma-like authoring cluster: grouped tool families, no duplicate layout/media surfaces. */}
        <div data-toolbar-cluster="authoring" className="flex items-center gap-0.5">
          <CursorDropdown toolMode={toolMode} commentModeActive={commentModeActive} onSelect={handleSelectTool} allowScale={!isViewer} />

          {!isViewer && <>
            {!isContainerSetMaster && (
              <CreatorGate locked={creatorLocked}>
                <FrameDropdown toolMode={toolMode} onSelect={() => handleToolClick('frame')} />
              </CreatorGate>
            )}

            <CreatorGate locked={creatorLocked}>
              <ShapeDropdown
                toolMode={toolMode}
                onSelect={(shape) => {
                  const shapeToMode: Record<string, ToolMode> = {
                    rectangle: 'shape-rect',
                    line: 'shape-line',
                    ellipse: 'shape-ellipse',
                    triangle: 'shape-triangle',
                  };
                  const mode = shapeToMode[shape];
                  if (mode) {
                    trace.action('toolbar:shape', { shape, mode });
                    setToolMode(mode);
                  }
                }}
                onOpenMedia={() => {
                  setToolMode('select');
                  setLeftPanel('media');
                  setLeftPaneOpen(true);
                  trace.action('toolbar:media-open');
                }}
              />
            </CreatorGate>

            <CreatorGate locked={creatorLocked}>
              <PenDropdown toolMode={toolMode} onSelect={(mode) => {
                trace.action('toolbar:pen-tool', { mode });
                setToolMode(mode);
              }} />
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
                <ResourcesButton />
              </CreatorGate>
            )}

          </>}
        </div>

        <Separator />

        {/* Secondary utility cluster stays intentionally tiny: routine fit,
            command search, comments, and account upgrade only. */}
        <div
          data-toolbar-cluster="utility"
          className="flex items-center gap-0.5"
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
              <span data-field-toolbar-glyph="search" className="inline-flex items-center justify-center"><SearchIcon className="w-4 h-4" /></span>
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
