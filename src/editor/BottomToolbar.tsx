// BottomToolbar.tsx — Floating bottom toolbar with tool modes, zoom, search, theme, comments.
// FIGUI3_BOTTOM_TOOLBAR_POLISH_20260925
// FIGUI3_BOTTOM_TOOLBAR_FIGMA_PARITY_20260926
// FIGUI3_TOOLBAR_RESOURCE_VIEW_CONTROLS_20260926
// FIGUI3_TOOLBAR_FIGMA_PASS_20260927
// FigUI3 true-float geometry: rounded island, quiet utility chrome, compact local menus.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useClickOutside } from './hooks/useClickOutside';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import { settingsOverlayOpenAtom, settingsSectionAtom, hasActiveSubscriptionAtom } from '@/code/stores/website-settings-store';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { toolModeAtom, panHighlightAtom, type ToolMode } from '@/code/stores/tool-store';
import { zoomToFit, zoomToFitSelection } from '@/canvas/transform';
import { signalUserCameraIntent } from '@/canvas/transform/camera-intent';
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
  FigmaImageIcon as MediaIcon,
  FigmaLibraryIcon as ResourcesIcon,
  FigmaSearchIcon as SearchIcon,
  FigmaCommentIcon as CommentBubbleIcon,
  FigmaPencilIcon as SketchPencilIcon,
  FigmaChevronDownIcon,
} from '@/shared/loew-figma-icons';
import { usePaletteToggle } from '@/editor/command-palette/CommandPalette';
import { trace } from '@/shared/debug-trace';
import { useIsViewer, useIsOffline } from '@/code/stores/viewer-mode-store';
import { CATEGORIES, CREATIVE_CATEGORIES } from '@/shared/insert-items/element-data';
import { ELEMENT_ICON_MAP } from '@/shared/insert-items/element-icons';
import { insertToolbarItemAtVisibleCenter } from '@/canvas/insert-toolbar-item';
import type { LibrarySection } from '@/editor/library-focus-store';
import { toolbarPanelAtom } from '@/editor/toolbar-panel-store';
import './bottom-toolbar-glyphs.css';

// ─── Menu affordance ───────────────────────────────────────────────────────

const ChevronDownSvg = () => <FigmaChevronDownIcon size={12} />;
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
      aria-current={active ? 'true' : undefined}
      className={`flex items-center w-full px-2.5 py-1.5 text-xs rounded-[5px] transition-colors gap-2 ${
        disabled
          ? 'text-[var(--text-disabled)] cursor-not-allowed opacity-50'
          : active
            ? 'text-[var(--text-primary)] bg-[var(--btn-secondary-bg)] cursor-pointer'
            : 'text-[var(--text-primary)] hover:bg-[var(--btn-secondary-bg)] cursor-pointer'
      }`}
      style={{ border: 'none', fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'left' }}
    >
      <span data-field-toolbar-glyph="menu" className="w-4 h-4 flex items-center justify-center shrink-0 overflow-hidden">{icon ?? null}</span>
      <span>{label}</span>
      {shortcut && <ShortcutHint text={shortcut} />}
    </button>
  );
}

function DropdownContainer({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div data-toolbar-dropdown className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 max-h-[70vh] overflow-y-auto rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-[var(--shadow-lg)] p-1 z-[100] ${wide ? 'w-[330px]' : 'min-w-[200px]'}`}>
      {children}
    </div>
  );
}

type MenuView = 'list' | 'icons';
function MenuViewToggle({ view, onChange }: { view: MenuView; onChange: (view: MenuView) => void }) {
  return <div className="flex items-center justify-end gap-0.5 border-b border-[var(--border-light)] px-1 py-1" aria-label="Menu view">
    <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => onChange('list')}
      className={`flex h-6 w-6 items-center justify-center rounded-[4px] text-xs ${view === 'list' ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>☰</button>
    <button type="button" aria-label="Icon view" aria-pressed={view === 'icons'} onClick={() => onChange('icons')}
      className={`flex h-6 w-6 items-center justify-center rounded-[4px] text-xs ${view === 'icons' ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>▦</button>
  </div>;
}

function MenuTile({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" data-toolbar-menu-tile onClick={onClick}
    className="flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[6px] bg-[var(--button-secondary-bg)] px-1 py-2 text-center text-[11px] text-[var(--text-secondary)] hover:bg-[var(--button-secondary-hover)] hover:text-[var(--text-primary)]">
    <span data-toolbar-menu-tile-icon className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden">{icon}</span>
    <span className="block max-w-full truncate">{label}</span>
  </button>;
}

function LayoutMiniIcon({ id }: { id: string }) {
  const cols = id === 'column' || id === 'layout-2col' || id === 'layout-3col' || id === 'layout-sidebar';
  const grid = id === 'layout-grid';
  const count = id === 'layout-3col' || id === 'layout-3row' ? 3 : 2;
  return <span aria-hidden className={`flex h-4 w-4 gap-[2px] rounded-[2px] border border-current p-[2px] ${cols ? 'flex-row' : 'flex-col'}`}>
    {Array.from({ length: grid ? 2 : count }, (_, index) => <span key={index}
      className={`min-h-0 min-w-0 flex-1 rounded-[1px] bg-current ${grid ? 'flex gap-[2px] bg-transparent' : ''}`}>
        {grid && <><span className="flex-1 rounded-[1px] bg-current" /><span className="flex-1 rounded-[1px] bg-current" /></>}
      </span>)}
  </span>;
}

function OutlineShapeIcon({ id }: { id: string }) {
  const paths: Record<string, string> = {
    'shape-star': 'm8 1.6 1.9 4 4.4.6-3.2 3.1.8 4.4L8 11.8 4.1 14l.8-4.4-3.2-3.1 4.4-.6Z',
    'shape-hexagon': 'M5 1.8h6l3 6.2-3 6.2H5L2 8Z',
    'shape-pentagon': 'M8 1.8 14 6l-2.3 8H4.3L2 6Z',
    button: 'M3.2 5.1h9.6a2.9 2.9 0 0 1 0 5.8H3.2a2.9 2.9 0 0 1 0-5.8Zm2.6 2.9h4.4',
  };
  return <svg aria-hidden viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d={paths[id]} /></svg>;
}

function DropdownDivider() {
  return <div className="h-px bg-[var(--border-light)] my-1" />;
}

// ─── Split Button (icon + chevron) ──────────────────────────────────────────

function ChangingToolIcon({ iconKey, children }: { iconKey: string; children: React.ReactNode }) {
  return (
    <span data-field-toolbar-glyph="tool-switch" data-icon={iconKey} className="inline-flex w-4 h-4 items-center justify-center">
      {children}
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
        aria-label={`${title} options`}
        aria-haspopup="menu"
        aria-expanded={open}
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

function CursorDropdown({ toolMode, commentModeActive, onSelect, allowScale, open, setOpen }: {
  toolMode: ToolMode; commentModeActive: boolean; onSelect: (m: ToolMode) => void; allowScale: boolean;
  open: boolean; setOpen: (open: boolean) => void;
}) {
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
        active={isActive}
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

function FrameDropdown({ toolMode, onSelect, open, setOpen }: { toolMode: ToolMode; onSelect: () => void; open: boolean; setOpen: (open: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<MenuView>('list');
  const setToolbarPanel = useSetAtom(toolbarPanelAtom);
  useClickOutside(ref, open, () => setOpen(false));
  const elementSections = CATEGORIES.find((category) => category.id === 'elements')?.sections ?? [];
  const basicItems = elementSections.find((section) => section.id === 'basic')?.items ?? [];
  const layoutItems = elementSections.find((section) => section.id === 'layouts')?.items.filter((item) =>
    item.id === 'column' || item.id === 'row' || item.id.startsWith('layout-')) ?? [];
  const insert = (id: string) => {
    insertToolbarItemAtVisibleCenter(id);
    setOpen(false);
  };

  const openSectionLibrary = useCallback(() => {
    setToolbarPanel({ kind: 'insert', category: 'elements', section: 'layouts' });
    setOpen(false);
    trace.action('toolbar:section-library');
  }, [setToolbarPanel, setOpen]);

  return (
    <div className="relative" ref={ref} data-tutorial="frame-tool">
      <SplitButton
        active={toolMode === 'frame'}
        open={open}
        icon={<FrameToolbarIcon className="w-4 h-4" />}
        onClick={onSelect}
        onChevronClick={() => setOpen(!open)}
        title="Frame (F)"
        dataTool="frame"
      />
      {open && (
        <DropdownContainer wide={view === 'icons'}>
          <MenuViewToggle view={view} onChange={setView} />
          {view === 'list' ? <>
            <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-tertiary)]">Basic</div>
            {basicItems.map((item) => <MenuItem key={item.id} label={item.name}
              shortcut={item.id === 'frame' ? 'F' : undefined}
              active={item.id === 'frame' && toolMode === 'frame'}
              icon={item.id === 'frame' ? <FrameToolbarIcon className="w-4 h-4" />
                : item.id === 'text' ? <TextToolbarIcon className="w-4 h-4" />
                  : item.id === 'button' ? <OutlineShapeIcon id="button" /> : <MediaIcon className="w-4 h-4" size={16} />}
              onClick={() => { if (item.id === 'frame') { onSelect(); setOpen(false); }
                else if (item.id === 'image') { setToolbarPanel({ kind: 'media-picker', media: 'image' }); setOpen(false); }
                else insert(item.id); }} />)}
            <DropdownDivider />
            <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-tertiary)]">Layouts</div>
            {layoutItems.map((item) => {
              const Icon = ELEMENT_ICON_MAP[item.iconKey];
              return <MenuItem key={item.id} label={item.name} icon={<LayoutMiniIcon id={item.id} />} onClick={() => insert(item.id)} />;
            })}
          </> : <div className="grid grid-cols-3 gap-1.5 p-1">
            {basicItems.map((item) => <MenuTile key={item.id} label={item.name}
              icon={item.id === 'frame' ? <FrameToolbarIcon /> : item.id === 'text' ? <TextToolbarIcon />
                : item.id === 'button' ? <OutlineShapeIcon id="button" /> : <MediaIcon size={30} />}
              onClick={() => { if (item.id === 'frame') { onSelect(); setOpen(false); }
                else if (item.id === 'image') { setToolbarPanel({ kind: 'media-picker', media: 'image' }); setOpen(false); }
                else insert(item.id); }} />)}
            {layoutItems.map((item) => {
              const Icon = ELEMENT_ICON_MAP[item.iconKey];
              return <MenuTile key={item.id} label={item.name} icon={Icon ? <Icon /> : null} onClick={() => insert(item.id)} />;
            })}
          </div>}
          <DropdownDivider />
          <MenuItem label="Section library…" icon={<LayoutRowsIcon className="w-4 h-4" size={16} />} onClick={openSectionLibrary} />
        </DropdownContainer>
      )}
    </div>
  );
}

// ─── Shape Dropdown ─────────────────────────────────────────────────────────

type ShapeToolChoice = 'rectangle' | 'line' | 'ellipse' | 'triangle';

function ShapeDropdown({ toolMode, onSelect, open, setOpen }: {
  toolMode: ToolMode;
  onSelect: (shape: ShapeToolChoice) => void;
  open: boolean; setOpen: (open: boolean) => void;
}) {
  // The icon reflects the selected drawing tool, even after another tool runs.
  const [lastChoice, setLastChoice] = useState<ShapeToolChoice>('rectangle');
  const [view, setView] = useState<MenuView>('list');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  const elementSections = CATEGORIES.find((category) => category.id === 'elements')?.sections ?? [];
  const extraShapes = elementSections.find((section) => section.id === 'shapes')?.items.filter((item) =>
    item.id === 'shape-star' || item.id === 'shape-hexagon' || item.id === 'shape-pentagon') ?? [];
  const buttonItem = elementSections.find((section) => section.id === 'basic')?.items.find((item) => item.id === 'button');

  useEffect(() => {
    if (toolMode === 'shape-rect') setLastChoice('rectangle');
    else if (toolMode === 'shape-ellipse') setLastChoice('ellipse');
    else if (toolMode === 'shape-triangle') setLastChoice('triangle');
    else if (toolMode === 'shape-line') setLastChoice('line');
  }, [toolMode]);

  const activeShape = toolMode === 'shape-rect' || toolMode === 'shape-line' || toolMode === 'shape-ellipse' || toolMode === 'shape-triangle';
  const currentChoice: ShapeToolChoice = activeShape
    ? (toolMode === 'shape-rect' ? 'rectangle' : toolMode === 'shape-line' ? 'line' : toolMode === 'shape-ellipse' ? 'ellipse' : 'triangle')
    : lastChoice;
  const choiceIcons: Record<ShapeToolChoice, React.ReactNode> = {
    rectangle: <ShapeSquareIcon className="w-4 h-4" size={16} />,
    ellipse: <ShapeCircleIcon className="w-4 h-4" size={16} />,
    triangle: <ShapeTriangleIcon className="w-4 h-4" size={16} />,
    line: <LineToolbarIcon className="w-4 h-4" />,
  };

  const choose = (choice: ShapeToolChoice) => {
    setLastChoice(choice);
    onSelect(choice);
    setOpen(false);
  };
  const insert = (id: string) => {
    insertToolbarItemAtVisibleCenter(id);
    setOpen(false);
  };
  const shapeChoices: { id: ShapeToolChoice; label: string; shortcut?: string }[] = [
    { id: 'rectangle', label: 'Rectangle', shortcut: 'R' },
    { id: 'line', label: 'Line', shortcut: 'L' },
    { id: 'ellipse', label: 'Ellipse', shortcut: 'O' },
    { id: 'triangle', label: 'Triangle', shortcut: 'Shift+T' },
  ];

  return (
    <div className="relative" ref={ref} data-tutorial="shape-tool">
      <SplitButton
        active={activeShape}
        open={open}
        iconKey={currentChoice}
        icon={choiceIcons[currentChoice]}
        onClick={() => choose(currentChoice)}
        onChevronClick={() => setOpen(!open)}
        title="Shape tools"
        dataTool="shape"
      />
      {open && (
        <DropdownContainer wide={view === 'icons'}>
          <MenuViewToggle view={view} onChange={setView} />
          {view === 'list' ? <>
            <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-tertiary)]">Shapes</div>
            {shapeChoices.map((choice) => <MenuItem key={choice.id} label={choice.label} shortcut={choice.shortcut}
              active={activeShape && currentChoice === choice.id} icon={choiceIcons[choice.id]}
              onClick={() => choose(choice.id)} />)}
            {extraShapes.map((item) => <MenuItem key={item.id} label={item.name}
              icon={<OutlineShapeIcon id={item.id} />} onClick={() => insert(item.id)} />)}
            {buttonItem && <><DropdownDivider /><MenuItem label="Button" icon={<OutlineShapeIcon id="button" />}
              onClick={() => insert('button')} /></>}
          </> : <div className="grid grid-cols-3 gap-1.5 p-1">
            {shapeChoices.map((choice) => <MenuTile key={choice.id} label={choice.label} icon={choiceIcons[choice.id]}
              onClick={() => choose(choice.id)} />)}
            {extraShapes.map((item) => <MenuTile key={item.id} label={item.name}
              icon={<OutlineShapeIcon id={item.id} />} onClick={() => insert(item.id)} />)}
            {buttonItem && <MenuTile label="Button" icon={<OutlineShapeIcon id="button" />}
              onClick={() => insert('button')} />}
          </div>}
        </DropdownContainer>
      )}
    </div>
  );
}

function TextDropdown({ toolMode, onSelect, open, setOpen }: {
  toolMode: ToolMode; onSelect: () => void; open: boolean; setOpen: (open: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<MenuView>('list');
  const setPanel = useSetAtom(toolbarPanelAtom);
  useClickOutside(ref, open, () => setOpen(false));
  const items = CATEGORIES.find((category) => category.id === 'elements')
    ?.sections.find((section) => section.id === 'typography')?.items ?? [];
  const selectText = () => { onSelect(); setOpen(false); };
  const insert = (id: string) => { insertToolbarItemAtVisibleCenter(id); setOpen(false); };
  return <div className="relative" ref={ref} data-tutorial="text-tool">
    <SplitButton active={toolMode === 'text'} open={open} icon={<TextToolbarIcon className="w-4 h-4" />}
      onClick={selectText} onChevronClick={() => setOpen(!open)} title="Draw Text (T)" dataTool="text" />
    {open && <DropdownContainer wide={view === 'icons'}>
      <MenuViewToggle view={view} onChange={setView} />
      {view === 'list' ? <>
        <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-tertiary)]">Typography</div>
        <MenuItem label="Text" shortcut="T" icon={<TextToolbarIcon className="w-4 h-4" />} active={toolMode === 'text'} onClick={selectText} />
        {items.map((item) => { const Icon = ELEMENT_ICON_MAP[item.iconKey]; return <MenuItem key={item.id}
          label={item.name} icon={Icon ? <Icon /> : undefined} onClick={() => insert(item.id)} />; })}
        <DropdownDivider />
        <MenuItem label="Text Effects…" onClick={() => {
          setOpen(false);
          setPanel({ kind: 'insert', category: 'creative-text-effects', categoryData: CREATIVE_CATEGORIES.find((category) => category.id === 'creative-text-effects') });
        }} />
      </> : <div className="grid grid-cols-3 gap-1.5 p-1">
        <MenuTile label="Text" icon={<TextToolbarIcon className="w-4 h-4" />} onClick={selectText} />
        {items.map((item) => { const Icon = ELEMENT_ICON_MAP[item.iconKey]; return <MenuTile key={item.id}
          label={item.name} icon={Icon ? <Icon /> : null} onClick={() => insert(item.id)} />; })}
      </div>}
    </DropdownContainer>}
  </div>;
}

// ─── Media menu ─────────────────────────────────────────────────────────────

function MediaDropdown({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<MenuView>('list');
  const setPanel = useSetAtom(toolbarPanelAtom);
  const chooseMedia = (id: string) => {
    setOpen(false);
    if (id === 'image' || id === 'video') setPanel({ kind: 'media-picker', media: id });
    else if (id === 'gallery') setPanel({ kind: 'gallery-picker' });
    else if (id === 'audio') setPanel({ kind: 'audio-picker' });
    else insertToolbarItemAtVisibleCenter(id);
  };
  useClickOutside(ref, open, () => setOpen(false));
  const mediaItems = [
    ...(CATEGORIES.find((category) => category.id === 'elements')?.sections.find((section) => section.id === 'basic')?.items.filter((item) => item.id === 'image') ?? []),
    ...(CATEGORIES.find((category) => category.id === 'elements')?.sections.find((section) => section.id === 'media')?.items ?? []),
  ];
  const embedItems = CATEGORIES.find((category) => category.id === 'integrations')
    ?.sections.find((section) => section.id === 'embeds')?.items ?? [];
  return (
    <div className="relative" ref={ref}>
      <SplitButton active={false} open={open} icon={<MediaIcon className="w-4 h-4" size={16} />}
        onClick={() => { setOpen(false); setPanel({ kind: 'media-picker', media: 'image' }); }} onChevronClick={() => setOpen(!open)} title="Media" dataTool="media" />
      {open && (
        <DropdownContainer wide={view === 'icons'}>
          <MenuViewToggle view={view} onChange={setView} />
          {view === 'icons' ? <div className="grid grid-cols-3 gap-1.5 p-1">{mediaItems.map((item) => {
            const Icon = ELEMENT_ICON_MAP[item.iconKey];
            return <MenuTile key={item.id} label={item.name} icon={Icon ? <Icon /> : null}
              onClick={() => chooseMedia(item.id)} />;
          })}
          <div className="col-span-3 mt-1 border-t border-[var(--border-light)] px-1 pt-2 text-[10px] font-semibold text-[var(--text-tertiary)]">Embeds</div>
          {embedItems.map((item) => { const Icon = ELEMENT_ICON_MAP[item.iconKey]; return <MenuTile key={item.id}
            label={item.name} icon={Icon ? <Icon /> : null} onClick={() => chooseMedia(item.id)} />; })}</div> : <>
          {mediaItems.map((item) => {
            const Icon = ELEMENT_ICON_MAP[item.iconKey];
            return <MenuItem key={item.id} label={item.name} icon={Icon ? <Icon /> : undefined}
              onClick={() => chooseMedia(item.id)} />;
          })}
          <DropdownDivider />
          <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-tertiary)]">Embeds</div>
          {embedItems.map((item) => { const Icon = ELEMENT_ICON_MAP[item.iconKey]; return <MenuItem key={item.id}
            label={item.name} icon={Icon ? <Icon /> : undefined} onClick={() => chooseMedia(item.id)} />; })}
          </>}
        </DropdownContainer>
      )}
    </div>
  );
}

// ─── Pen / Pencil Dropdown ──────────────────────────────────────────────────

function PenDropdown({ toolMode, onSelect, open, setOpen }: { toolMode: ToolMode; onSelect: (mode: 'shape-path' | 'sketch') => void; open: boolean; setOpen: (open: boolean) => void }) {
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
        active={active}
        open={open}
        iconKey={current}
        icon={icon}
        onClick={() => onSelect(current)}
        onChevronClick={() => setOpen(!open)}
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
    signalUserCameraIntent(selectedId ? 'toolbar:fit-selection' : 'toolbar:fit-canvas');
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

// ─── Library ────────────────────────────────────────────────────────────────

function LibraryDropdown({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const setToolbarPanel = useSetAtom(toolbarPanelAtom);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  const openLibrary = useCallback((section: LibrarySection) => {
    setToolbarPanel({ kind: 'library', section });
    setOpen(false);
    trace.action('toolbar:library-open', { section });
  }, [setToolbarPanel, setOpen]);

  return (
    <div className="relative" ref={ref}>
      <SplitButton active={false} open={open} icon={<ResourcesIcon className="w-4 h-4" size={16} />}
        onClick={() => setOpen(!open)} onChevronClick={() => setOpen(!open)} title="Library" dataTool="library" />
      {open && <DropdownContainer>
        <MenuItem label="Components" onClick={() => openLibrary('components')} />
        <MenuItem label="Vectors" onClick={() => openLibrary('vectors')} />
        <MenuItem label="Templates" onClick={() => openLibrary('templates')} />
        <MenuItem label="Code Overrides" onClick={() => openLibrary('code-overrides')} />
        <MenuItem label="Plugins" onClick={() => openLibrary('plugins')} />
      </DropdownContainer>}
    </div>
  );
}

// ─── Main BottomToolbar ─────────────────────────────────────────────────────

export default function BottomToolbar() {
  const [toolMode, setToolMode] = useAtom(toolModeAtom);
  const [openMenu, setOpenMenu] = useState<'cursor' | 'frame' | 'shape' | 'media' | 'library' | 'pen' | 'text' | null>(null);
  const menuProps = (menu: 'cursor' | 'frame' | 'shape' | 'media' | 'library' | 'pen' | 'text') => ({
    open: openMenu === menu,
    setOpen: (open: boolean) => setOpenMenu(open ? menu : null),
  });
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
    setOpenMenu(null);
    setToolMode(mode);
    // Picking a creator tool exits comment mode (mutually exclusive,
    // mirrors the builder's behavior).
    if (commentModeActive) setCommentModeActive(false);
  }, [setToolMode, commentModeActive, setCommentModeActive]);

  // Cursor / Hand selection — same as picking any tool, comment mode is
  // mutually exclusive so selecting the cursor exits it. Clicking the
  // cursor button while in comment mode is the user's "back to V".
  const handleSelectTool = useCallback((mode: ToolMode) => {
    trace.action('toolbar:select-tool', { mode });
    setOpenMenu(null);
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
          <CursorDropdown toolMode={toolMode} commentModeActive={commentModeActive} onSelect={handleSelectTool} allowScale={!isViewer} {...menuProps('cursor')} />

          {!isViewer && <>
            {!isContainerSetMaster && (
              <CreatorGate locked={creatorLocked}>
                <FrameDropdown toolMode={toolMode} onSelect={() => handleToolClick('frame')} {...menuProps('frame')} />
              </CreatorGate>
            )}

            <CreatorGate locked={creatorLocked}>
              <ShapeDropdown
                toolMode={toolMode}
                {...menuProps('shape')}
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
                    setOpenMenu(null);
                    setToolMode(mode);
                  }
                }}
              />
            </CreatorGate>

            {!isContainerSetMaster && (
              <CreatorGate locked={creatorLocked}>
                <MediaDropdown {...menuProps('media')} />
              </CreatorGate>
            )}

            {!isContainerSetMaster && (
              <CreatorGate locked={creatorLocked}>
                <LibraryDropdown {...menuProps('library')} />
              </CreatorGate>
            )}

            <CreatorGate locked={creatorLocked}>
              <PenDropdown toolMode={toolMode} {...menuProps('pen')} onSelect={(mode) => {
                trace.action('toolbar:pen-tool', { mode });
                setOpenMenu(null);
                setToolMode(mode);
              }} />
            </CreatorGate>
            {!isContainerSetMaster && (
              <CreatorGate locked={creatorLocked}>
                <TextDropdown toolMode={toolMode} onSelect={() => handleToolClick('text')} {...menuProps('text')} />
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
