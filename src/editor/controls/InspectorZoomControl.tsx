import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
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

function MenuRow({ label, shortcut, onClick }: {
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-6 px-3 py-1.5 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
    >
      <span>{label}</span>
      {shortcut && <span className="text-[10px] text-[var(--text-disabled)]">{shortcut}</span>}
    </button>
  );
}

/** Figma-style zoom readout in the inspector mode bar.
 * BottomToolbar keeps the canvas command surface; this is the canonical
 * inspector readout/menu the reference exposes at the upper-right. */
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
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        data-inspector-zoom
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="h-7 px-2 flex items-center gap-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-[var(--control-radius)]"
        title="Zoom"
      >
        <span className="tabular-nums">{zoom}%</span>
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-[10020] min-w-[190px] py-1.5 bg-[var(--dropdown-bg)] border border-[var(--border-light)] rounded-lg shadow-[var(--shadow-lg)]">
          <MenuRow label="Fit" shortcut="⇧1" onClick={() => withCanvas(root => zoomToFit(root))} />
          <MenuRow label="Fit selection" shortcut="⇧2" onClick={() => withCanvas(root => zoomToFitSelection(root, selectedId ? [selectedId] : []))} />
          <MenuRow label="Zoom to 100%" shortcut="⇧3" onClick={() => { zoomTo100(); setOpen(false); }} />
          <div className="h-px bg-[var(--border-light)] my-1" />
          <MenuRow label="Zoom in" onClick={() => { zoomIn(); setOpen(false); }} />
          <MenuRow label="Zoom out" onClick={() => { zoomOut(); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}
