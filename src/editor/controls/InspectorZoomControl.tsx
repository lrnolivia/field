// InspectorZoomControl.tsx — compact Inspector view controls.
// FIGUI3_INSPECTOR_VIEW_CONTROLS_20260926
//
// Zoom stays in the Inspector utility area. Pane actions live in the shared right header.
// Editor appearance lives on the canonical left rail.

import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { selectedNodeAtom } from '@/code/stores/store';
import {
  transformManager,
  zoomIn,
  zoomOut,
  zoomTo100,
  zoomToFit,
  zoomToFitSelection,
} from '@/canvas/transform';
import { getContentRoot } from '@/canvas/node-ops';
import { fieldSurfaceZ } from '@/shared/field-surface-elevation';
import { signalUserCameraIntent } from '@/canvas/transform/camera-intent';


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

/** Compact zoom readout. */
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

  const withCanvas = (source: string, fn: (root: HTMLElement) => void) => {
    const root = getContentRoot();
    if (root) {
      signalUserCameraIntent(source);
      fn(root);
    }
    setOpen(false);
  };

  const runCameraCommand = (source: string, fn: () => void) => {
    signalUserCameraIntent(source);
    fn();
    setOpen(false);
  };

  return (
    <div data-inspector-view-controls className="relative flex items-center gap-0.5">
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
            <MenuRow label="Fit canvas" shortcut="⇧1" onClick={() => withCanvas('inspector:fit-canvas', root => zoomToFit(root))} />
            <MenuRow label="Fit selection" shortcut="⇧2" onClick={() => withCanvas('inspector:fit-selection', root => zoomToFitSelection(root, selectedId ? [selectedId] : []))} />
            <MenuRow label="Zoom to 100%" shortcut="⇧3" onClick={() => runCameraCommand('inspector:zoom-100', zoomTo100)} />
            <div className="h-px bg-[var(--border-light)] my-1" />
            <MenuRow label="Zoom in" onClick={() => runCameraCommand('inspector:zoom-in', zoomIn)} />
            <MenuRow label="Zoom out" onClick={() => runCameraCommand('inspector:zoom-out', zoomOut)} />
          </div>
        )}
      </div>
    </div>
  );
}
