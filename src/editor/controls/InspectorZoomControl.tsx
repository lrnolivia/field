// InspectorZoomControl.tsx — compact Inspector view controls.
// FIGUI3_INSPECTOR_VIEW_CONTROLS_20260926
//
// Full zoom + editor appearance belong in the Inspector utility area.
// BottomToolbar keeps only the one-click smart Fit action.

import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { selectedNodeAtom } from '@/code/stores/store';
import {
  transformManager,
  zoomIn,
  zoomOut,
  zoomTo100,
  zoomToFit,
  zoomToFitSelection,
} from '@/canvas/transform';
import { getContentRoot, refreshCanvasTokens } from '@/canvas/node-ops';
import ThemeNeutralPopover from '@/editor/ui/ThemeNeutralPopover';
import { editorNeutralLevelAtom, editorThemeModeAtom } from '@/code/stores/user-preferences-store';
import type { EditorNeutralLevel, EditorThemeMode } from '@/shared/editor-neutral-theme';
import { FigmaMoonIcon, FigmaSunIcon } from '@/shared/loew-figma-icons';
import { fieldSurfaceZ } from '@/shared/field-surface-elevation';
import { trace } from '@/shared/debug-trace';

function MenuRow({ label, shortcut, onClick }: {
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-6 rounded-[5px] px-2.5 py-1.5 text-[11px] text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
    >
      <span>{label}</span>
      {shortcut && <span className="text-[10px] text-[var(--text-disabled)]">{shortcut}</span>}
    </button>
  );
}

function InspectorThemeControl() {
  const [mode, setMode] = useAtom(editorThemeModeAtom);
  const [neutralLevel, setNeutralLevel] = useAtom(editorNeutralLevelAtom);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const applyChoice = useCallback((nextMode: EditorThemeMode, nextLevel: EditorNeutralLevel) => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    setMode(nextMode);
    setNeutralLevel(nextLevel);
    window.setTimeout(() => root.classList.remove('theme-transition'), 200);
    requestAnimationFrame(() => refreshCanvasTokens());
    setOpen(false);
    trace.action('inspector:theme-neutral', { mode: nextMode, level: nextLevel });
  }, [setMode, setNeutralLevel]);

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        data-inspector-theme
        aria-expanded={open}
        aria-label={'Editor appearance: ' + mode + ', neutral ' + neutralLevel}
        title={'Editor appearance: ' + mode + ' · Neutral ' + neutralLevel}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-6 w-6 items-center justify-center rounded-[4px] border-none transition-colors ${
          open
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        {mode === 'dark'
          ? <FigmaMoonIcon className="h-3.5 w-3.5" size={14} />
          : <FigmaSunIcon className="h-3.5 w-3.5" size={14} />
        }
      </button>
      {open && (
        <ThemeNeutralPopover
          mode={mode}
          level={neutralLevel}
          anchorRef={anchorRef}
          placement="below"
          onSelect={applyChoice}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/** Compact zoom readout + appearance control in the Inspector mode bar. */
export default function InspectorZoomControl() {
  const selectedId = useAtomValue(selectedNodeAtom);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(() => Math.round(transformManager.getTransform().scale * 100));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sync = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        setZoom(Math.round(transformManager.getTransform().scale * 100));
      }, 120);
    };
    const unsub = transformManager.subscribe(sync);
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [open]);

  const withCanvas = (fn: (root: HTMLElement) => void) => {
    const root = getContentRoot();
    if (root) fn(root);
    setOpen(false);
  };

  return (
    <div data-inspector-view-controls className="relative ml-auto flex items-center gap-0.5">
      <InspectorThemeControl />
      <div ref={ref} className="relative">
        <button
          type="button"
          data-inspector-zoom
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className={`flex h-6 min-w-[46px] items-center justify-center gap-1 rounded-[4px] px-1.5 text-[11px] font-medium tabular-nums transition-colors ${
            open
              ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
          title="Zoom"
        >
          <span>{zoom}%</span>
          <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>

        {open && (
          <div
            data-field-floating-surface
            data-field-no-canvas-input
            className="absolute right-0 top-full mt-1 min-w-[190px] rounded-[8px] border border-[var(--border-light)] bg-[var(--dropdown-bg)] p-1 shadow-[var(--shadow-lg)]"
            style={{ zIndex: fieldSurfaceZ('menu', ref.current) }}
          >
            <MenuRow label="Fit canvas" shortcut="⇧1" onClick={() => withCanvas(root => zoomToFit(root))} />
            <MenuRow label="Fit selection" shortcut="⇧2" onClick={() => withCanvas(root => zoomToFitSelection(root, selectedId ? [selectedId] : []))} />
            <MenuRow label="Zoom to 100%" shortcut="⇧3" onClick={() => { zoomTo100(); setOpen(false); }} />
            <div className="h-px bg-[var(--border-light)] my-1" />
            <MenuRow label="Zoom in" onClick={() => { zoomIn(); setOpen(false); }} />
            <MenuRow label="Zoom out" onClick={() => { zoomOut(); setOpen(false); }} />
          </div>
        )}
      </div>
    </div>
  );
}
