import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';
import { transformManager } from '@/canvas/transform';
import { moveCanvasTo } from '@/canvas/transform/CameraAnimator';
import { getProjectId } from '@/backend/project-id';
import { selectedIdsAtom } from '@/code/stores/store';
import { useNode } from '@/code/stores/node-family';
import { activeFilePathAtom, getFriendlyFileName } from '@/code/project/active-file-store';
import { toolModeAtom } from '@/code/stores/tool-store';
import { mobileFocusActiveAtom, rightPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { useIsViewer } from '@/code/stores/viewer-mode-store';
import { settingsOverlayOpenAtom } from '@/code/stores/website-settings-store';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { undo, redo } from '@/code/mutation/history';
import { isGalleryNode } from '@/code/gallery/gallery-model';
import { FigmaChevronDownIcon } from '@/shared/loew-figma-icons';
import MobileGlyph from './MobileGlyph';
import PropertiesPanel from '../PropertiesPanel';
import CommentsListPanel from '../CommentsListPanel';
import { PANEL_MAP } from '../left-toolbar/LeftPanel';
import { toolbarPanelAtom } from '../toolbar-panel-store';
import LibraryPanel from '../left-toolbar/panels/LibraryPanel';
import { SecondaryPanelContent } from '../left-toolbar/panels/insert';
import { CATEGORIES, CREATIVE_CATEGORIES } from '@/shared/insert-items/element-data';
import { floatingPanelCollapsedAtom } from '../workspace-mode-store';
import { QuickTools } from './QuickTools';
import { PortraitPages, PortraitLayers } from './PortraitBrowser';
import PortraitLibrary from './PortraitLibrary';
import { PORTRAIT_EDIT_EVENT, type PortraitDestination, type InspectorTask } from './interaction';
import './portrait-workspace.css';

const DESTINATIONS: Array<{ id: PortraitDestination; title: string; detail: string }> = [
  { id: 'project', title: 'Project', detail: 'Preview, publish and project options' },
  { id: 'pages', title: 'Pages', detail: 'Choose a page or manage routes' },
  { id: 'layers', title: 'Layers', detail: 'Find, select and arrange objects' },
  { id: 'media', title: 'Media', detail: 'Choose images, video and audio' },
  { id: 'library', title: 'Library', detail: 'Components, vectors and templates' },
  { id: 'presets', title: 'Presets', detail: 'Your reusable styles' },
  { id: 'insert', title: 'Insert', detail: 'Elements and integrations' },
  { id: 'cms', title: 'CMS', detail: 'Collections and content' },
  { id: 'locale', title: 'Languages', detail: 'Translations and locales' },
  { id: 'comments', title: 'Comments', detail: 'Review feedback on this project' },
  { id: 'branches', title: 'Branches', detail: 'Review project versions' },
];
const TASKS: Array<{ id: InspectorTask; title: string }> = [
  { id: 'context', title: 'Edit' }, { id: 'geometry', title: 'Layout' },
  { id: 'appearance', title: 'Appearance' }, { id: 'content', title: 'Content' },
  { id: 'prototype', title: 'Behavior' }, { id: 'advanced', title: 'Advanced' }, { id: 'export', title: 'Export' },
];

type PortraitSession = { key: string; destination: PortraitDestination | null; task: InspectorTask; allTasks: boolean; lastBrowse: PortraitDestination; expanded: boolean; selection: string };
let lastPortraitSession: PortraitSession | null = null;

export default function PortraitWorkspace({ projectControls }: { projectControls?: ReactNode }) {
  const file = useAtomValue(activeFilePathAtom);
  const selected = useAtomValue(selectedIdsAtom);
  const sessionKey = `${getProjectId()}|${file}`;
  const saved = lastPortraitSession?.key === sessionKey ? lastPortraitSession : null;
  const [destination, setDestination] = useState<PortraitDestination | null>(() => history.state?.fieldPortraitTask ? saved?.destination ?? null : null);
  const [task, setTask] = useState<InspectorTask>(() => saved?.selection === selected.join('|') ? saved.task : 'context');
  const [allTasks, setAllTasks] = useState(saved?.allTasks ?? false);
  const [lastBrowse, setLastBrowse] = useState<PortraitDestination>(saved?.lastBrowse ?? 'browse');
  const [expanded, setExpanded] = useState(saved?.expanded ?? false);
  const large = expanded || !!destination && ['project', 'comments', 'media', 'library', 'presets', 'cms', 'locale', 'branches', 'insert', 'pages'].includes(destination);
  const node = useNode(selected[0]);
  const gallery = selected.length === 1 && isGalleryNode(node);
  const fullScreen = destination === 'library' || (destination === 'inspect' && gallery);
  const mode = useAtomValue(toolModeAtom);
  const viewer = useIsViewer();
  const reduced = useFieldReducedMotion();
  const mobileFocusActive = useAtomValue(mobileFocusActiveAtom);
  const [rightOpen, setRightOpen] = useAtom(rightPaneOpenAtom);
  const [leftCollapsed, collapseLeft] = useAtom(floatingPanelCollapsedAtom);
  const [leftPanel, setLeftPanel] = useAtom(leftPanelAtom);
  const [toolbarPanel, setToolbarPanel] = useAtom(toolbarPanelAtom);
  const setSettingsOpen = useSetAtom(settingsOverlayOpenAtom);
  const surface = useRef<HTMLElement>(null);
  const revealPoint = useRef<{ x: number; y: number } | null>(null);
  const automaticCamera = useRef<{ before: { x: number; y: number; scale: number }; after: { x: number; y: number; scale: number } } | null>(null);
  const toolsButton = useRef<HTMLButtonElement>(null);
  const browseButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const focusPending = useRef(false);
  const returnToBrowse = useRef(false);
  const historyOwned = useRef(Boolean(history.state?.fieldPortraitTask));
  const sessionRef = useRef<PortraitSession | null>(null);
  sessionRef.current = { key: sessionKey, destination, task, allTasks, lastBrowse, expanded, selection: selected.join('|') };
  useEffect(() => () => { lastPortraitSession = sessionRef.current; }, []);
  const destRef = useRef(destination); destRef.current = destination;
  const open = useCallback((next: PortraitDestination) => {
    if (!destRef.current) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      returnToBrowse.current = returnFocus.current?.getAttribute('aria-label') === 'Open browse';
      history.pushState({ ...history.state, fieldPortraitTask: true }, '', location.href);
      historyOwned.current = true;
    }
    setDestination(next); setExpanded(false); setAllTasks(false);
    if (next !== 'inspect' && next !== 'tools') setLastBrowse(next);
  }, []);
  const close = useCallback(() => {
    const camera = automaticCamera.current;
    if (camera) {
      const current = transformManager.getTransform();
      if (Math.abs(current.x - camera.after.x) < 1 && Math.abs(current.y - camera.after.y) < 1 && Math.abs(current.scale - camera.after.scale) < .001) moveCanvasTo(camera.before.x, camera.before.y, camera.before.scale);
      automaticCamera.current = null;
    }
    focusPending.current = true;
    setDestination(null); setToolbarPanel(null); setRightOpen(false); collapseLeft(true);
    if (historyOwned.current && history.state?.fieldPortraitTask) { historyOwned.current = false; history.back(); }

  }, [setToolbarPanel, setRightOpen, collapseLeft]);
  useEffect(() => {
    const pop = () => { historyOwned.current = false; close(); };
    window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('popstate', pop); if (window.innerWidth <= 600 && historyOwned.current && history.state?.fieldPortraitTask) { const state = { ...history.state }; delete state.fieldPortraitTask; history.replaceState(state, '', location.href); } };
  }, [close]);
  useEffect(() => {
    const edit = (event: Event) => {
      const detail = (event as CustomEvent<{ clientX: number; clientY: number }>).detail;
      revealPoint.current = detail ? { x: detail.clientX, y: detail.clientY } : null;
      setTask('context'); open('inspect');
    };
    window.addEventListener(PORTRAIT_EDIT_EVENT, edit);
    window.addEventListener('field:portrait-close', close);
    return () => { window.removeEventListener(PORTRAIT_EDIT_EVENT, edit); window.removeEventListener('field:portrait-close', close); };
  }, [open, close]);
  // Existing headers, shortcuts and resource launches converge on this host.
  // On rotation this host can mount one render before the focus coordinator's
  // layout effect switches the derived pane atoms from desktop to mobile. That
  // desktop snapshot is not a new open command and must not replace the saved
  // portrait task or write a collapse into the user's desktop preference.
  useEffect(() => { if (mobileFocusActive && rightOpen) { open('inspect'); setRightOpen(false); } }, [mobileFocusActive, rightOpen, open, setRightOpen]);
  useEffect(() => { if (mobileFocusActive && !leftCollapsed) { open(leftPanel === 'layers' || leftPanel === 'pages-layers' ? 'layers' : leftPanel === 'vibe' ? 'browse' : leftPanel); collapseLeft(true); } }, [mobileFocusActive, leftCollapsed, leftPanel, open, collapseLeft]);
  useEffect(() => { if (toolbarPanel) open(toolbarPanel.kind === 'insert' ? 'insert' : toolbarPanel.kind); }, [toolbarPanel, open]);
  const selectionKey = selected.join('|');
  const previousSelection = useRef(selectionKey);
  useEffect(() => { if (previousSelection.current !== selectionKey) { previousSelection.current = selectionKey; setTask('context'); setAllTasks(false); } }, [selectionKey]);
  useEffect(() => {
    if (!destination) return;
    const key = (e: KeyboardEvent) => {
      if (document.querySelector('[data-field-modal-window]')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab' && (large || fullScreen)) {
        const controls = Array.from(surface.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') ?? []).filter(el => el.getClientRects().length);
        if (!controls.length) return;
        if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls[controls.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === controls[controls.length - 1]) { e.preventDefault(); controls[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [destination, large, fullScreen, close]);
  useLayoutEffect(() => {
    if (!destination) {
      if (focusPending.current) { focusPending.current = false; (returnToBrowse.current ? browseButton.current : toolsButton.current)?.focus({ preventScroll: true }); }
      return;
    }
    surface.current?.focus({ preventScroll: true });
    const point = revealPoint.current; revealPoint.current = null;
    if (point && destination === 'inspect' && surface.current) {
      const top = surface.current.getBoundingClientRect().top;
      if (point.y > top - 32) {
        const before = transformManager.getTransform();
        transformManager.pan(0, top - 32 - point.y);
        automaticCamera.current = { before: { ...before }, after: { ...transformManager.getTransform() } };
      }
    }
  }, [destination]);
  useEffect(() => {
    const reveal = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && surface.current?.contains(active)) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    window.visualViewport?.addEventListener('resize', reveal);
    return () => window.visualViewport?.removeEventListener('resize', reveal);
  }, []);
  const title = destination === 'inspect' ? selected.length > 1 ? `${selected.length} objects` : node?.name || node?.type || 'Page'
    : destination === 'tools' ? 'Tools' : destination === 'browse' ? 'Browse' : DESTINATIONS.find(d => d.id === destination)?.title || 'Browse';

  const back = () => {
    if (toolbarPanel) { setToolbarPanel(null); return; }
    if (destination === 'inspect' && (allTasks || task !== 'context')) { setAllTasks(false); setTask('context'); return; }
    if (destination !== 'browse' && destination !== 'tools' && destination !== 'inspect') { open('browse'); return; }
    close();
  };
  const chooseBrowse = (id: PortraitDestination) => {
    if (id === 'media') setToolbarPanel({ kind: 'media' });
    if (!['browse', 'project', 'comments', 'pages', 'tools', 'inspect'].includes(id)) setLeftPanel(id === 'layers' ? 'layers' : id as typeof leftPanel);
    open(id);
  };
  const Panel = destination ? PANEL_MAP[destination] : undefined;
  const category = toolbarPanel?.kind === 'insert' ? toolbarPanel.categoryData || [...CATEGORIES, ...CREATIVE_CATEGORIES].find(c => c.id === toolbarPanel.category) : undefined;
  // Media owns its dedicated adaptive controller and explicit placement step.
  const mediaOwnsSurface = toolbarPanel?.kind === 'media';
  return <div data-portrait-workspace data-field-no-canvas-input>
    <div className="field-portrait-topbar" aria-hidden={fullScreen || undefined} inert={fullScreen || undefined}><button type="button" className="field-mobile-main-pill" aria-label="Open project" onClick={() => open('project')}><MobileGlyph name="project" size={20} /><span>{getFriendlyFileName(file)}</span></button><div>
      <button type="button" aria-label="Undo" disabled={viewer} onClick={() => undo()}><MobileGlyph name="undo" size={20} /></button>
      <button type="button" aria-label="Redo" disabled={viewer} onClick={() => redo()}><MobileGlyph name="redo" size={20} /></button>
      <button type="button" aria-label="Open settings" onClick={() => setSettingsOpen(true)}><MobileGlyph name="settings" size={20} /></button>
    </div></div>
    <AnimatePresence>{destination && !mediaOwnsSurface && <>
      {destination === 'tools' && <div className="field-portrait-tool-dismiss" onClick={close} />}
      {large && <motion.div className="field-portrait-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />}
      <motion.section ref={surface} tabIndex={-1} role="dialog" aria-modal={large || fullScreen || undefined} aria-label={title}
        data-portrait-surface={destination} data-expanded={large} data-mobile-full-screen={fullScreen || undefined} className="field-portrait-surface"
        initial={reduced ? false : { opacity: 0, y: 24, scale: .97, filter: 'blur(1.5px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: .98 }}
        transition={{ ...fieldSpatialTransition(reduced, fieldMotion.disclosure), layout: fieldSpatialTransition(reduced, { type: 'spring', stiffness: 520, damping: 42.3, mass: .86 }) }}>
        <header><button type="button" aria-label="Back" onClick={back}><FigmaChevronDownIcon size={18} className="rotate-90" /></button><span className="field-mobile-header-glyph"><MobileGlyph name={gallery && destination === 'inspect' ? 'gallery' : destination === 'tools' ? 'tools' : destination === 'inspect' ? 'inspect' : destination === 'browse' ? 'browse' : destination} /></span><div><h2>{title}</h2>{destination === 'inspect' && <span>{viewer ? 'View only' : 'Changes save as you edit'}</span>}</div>
          {!fullScreen && (destination === 'inspect' || destination === 'layers') ? <button type="button" aria-label={expanded ? 'Show canvas' : 'Expand workspace'} onClick={() => setExpanded(!expanded)}><MobileGlyph name="expand" size={20} /></button> : null}
          <button type="button" onClick={close} aria-label={destination === 'inspect' ? 'Close Properties' : `Close ${title}`}>Done</button>
        </header>
        <div className="field-portrait-content" data-field-chrome-panel>
          {destination === 'tools' && <div data-mobile-toolbar-expanded><QuickTools onChoose={close} /></div>}
          {destination === 'browse' && <nav aria-label="Browse project">{DESTINATIONS.map(d => <button type="button" key={d.id} className="field-portrait-destination" onClick={() => chooseBrowse(d.id)}>
            <span className="field-mobile-menu-glyph"><MobileGlyph name={d.id} /></span>
            <span><strong>{d.title}</strong><small>{d.detail}</small></span><FigmaChevronDownIcon size={16} className="-rotate-90" />
          </button>)}</nav>}
          {destination === 'comments' && <CommentsListPanel />}
          {destination === 'project' && <div className="field-portrait-project-controls">{projectControls}</div>}
          {destination === 'library' && !toolbarPanel && <PortraitLibrary onPlace={close} />}
          {destination === 'pages' && <PortraitPages onChoose={close} />}
          {destination === 'layers' && <PortraitLayers onEdit={() => open('inspect')} />}
          {destination === 'inspect' && <>
            {fullScreen && <nav className="field-mobile-history" aria-label="Gallery history"><button type="button" aria-label="Undo" disabled={viewer} onClick={() => undo()}><MobileGlyph name="undo" size={18} />Undo</button><button type="button" aria-label="Redo" disabled={viewer} onClick={() => redo()}><MobileGlyph name="redo" size={18} />Redo</button></nav>}
            <nav className="field-portrait-task-nav" aria-label="Property tasks">
              {TASKS.slice(0, 3).map(t => <button type="button" key={t.id} aria-pressed={!allTasks && task === t.id} onClick={() => { setTask(t.id); setAllTasks(false); }}>{gallery ? t.id === 'context' ? 'Images' : t.id === 'geometry' ? 'Layout' : 'Image treatment' : t.title}</button>)}
              <button type="button" aria-expanded={allTasks} onClick={() => setAllTasks(!allTasks)}>All properties</button>
            </nav>
            {allTasks ? <nav aria-label="All property categories">{TASKS.map(t => <button type="button" key={t.id} className="field-portrait-row" onClick={() => { setTask(t.id); setAllTasks(false); }}>{t.title}<FigmaChevronDownIcon size={16} className="-rotate-90" /></button>)}</nav>
              : <fieldset disabled={viewer} className="field-portrait-inspector"><PropertiesPanel mobileTask={task} /></fieldset>}
          </>}
          {toolbarPanel?.kind === 'library' ? <LibraryPanel mode="library" focusSection={toolbarPanel.section} />
            : toolbarPanel?.kind === 'insert' && category ? <SecondaryPanelContent category={category} sectionId={toolbarPanel.section} />
              : destination && !['tools', 'browse', 'pages', 'layers', 'inspect', 'library'].includes(destination) && Panel ? <Panel /> : null}
        </div>
      </motion.section>
    </>}</AnimatePresence>
    {!destination && <div className="field-portrait-dock" id="bottom-toolbar-container">
      <button ref={browseButton} type="button" className="field-browse-button" aria-label="Open browse" onClick={() => open(lastBrowse)}><MobileGlyph name="browse" /><span>Browse</span></button>
      <button ref={toolsButton} type="button" className="field-tools-fab" data-mobile-toolbar-launcher aria-label="Open tools" aria-expanded={false} onClick={() => open('tools')}><MobileGlyph name="tools" /><span>Tools<small>{mode === 'select' ? 'Move' : mode.replace('shape-', '')}</small></span></button>
    </div>}
  </div>;
}
