import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';
import { toolModeAtom, creatorToolsLockedAtom, type ToolMode, isCreatorToolMode } from '@/code/stores/tool-store';
import { commentModeActiveAtom } from '@/code/stores/comment-store';
import { useIsViewer } from '@/code/stores/viewer-mode-store';
import { FieldGlyph } from '@/editor/glyph';
import { FigmaCursorIcon, FigmaFrameIcon, FigmaTextIcon, FigmaHandIcon, FigmaSquareIcon, FigmaCircleIcon, FigmaTriangleIcon, FigmaSearchIcon, FigmaCommentIcon, FigmaPathIcon, FigmaPencilIcon } from '@/shared/loew-figma-icons';
import { zoomToFit } from '@/canvas/transform';
import { getContentRoot } from '@/canvas/node-ops';
import { usePaletteToggle } from '@/editor/command-palette/CommandPalette';
import { movedPastTapSlop } from './interaction';
import { useMobileWorkspacePresentation } from '../mobile-workspace-presentation';

const ScaleIcon: typeof FigmaCursorIcon = ({ size = 20, ...props }) => <svg {...props} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3.25 6.1V3.25H6.1M9.9 12.75h2.85V9.9M3.55 3.55l3.1 3.1M12.45 12.45l-3.1-3.1" /></svg>;
const TOOLS: Array<{ mode: ToolMode; label: string; icon: typeof FigmaCursorIcon; primary?: boolean }> = [
  { mode: 'select', label: 'Move', icon: FigmaCursorIcon, primary: true },
  { mode: 'frame', label: 'Frame', icon: FigmaFrameIcon, primary: true },
  { mode: 'text', label: 'Text', icon: FigmaTextIcon, primary: true },
  { mode: 'shape-rect', label: 'Shape', icon: FigmaSquareIcon, primary: true },
  { mode: 'hand', label: 'Hand', icon: FigmaHandIcon },
  { mode: 'scale', label: 'Scale', icon: ScaleIcon },
  { mode: 'shape-line', label: 'Line', icon: FigmaPathIcon },
  { mode: 'shape-triangle', label: 'Triangle', icon: FigmaTriangleIcon },
  { mode: 'shape-ellipse', label: 'Ellipse', icon: FigmaCircleIcon },
  { mode: 'shape-path', label: 'Pen', icon: FigmaPathIcon },
  { mode: 'sketch', label: 'Pencil', icon: FigmaPencilIcon },
];
export function QuickTools({ onChoose }: { onChoose: () => void }) {
  const [mode, setMode] = useAtom(toolModeAtom);
  const togglePalette = usePaletteToggle();
  const locked = useAtomValue(creatorToolsLockedAtom);
  const viewer = useIsViewer();
  const setComment = useSetAtom(commentModeActiveAtom);
  const render = ({ mode: value, label, icon: Icon, primary }: typeof TOOLS[number]) => {
    const disabled = (viewer && value !== 'select' && value !== 'hand') || (locked && isCreatorToolMode(value));
    return <button type="button" key={value} disabled={disabled} aria-pressed={mode === value}
      className={primary ? 'field-quick-tile' : 'field-quick-row'} onClick={() => { setComment(false); setMode(value); onChoose(); }}>
      <FieldGlyph behavior="generic"><Icon size={20} /></FieldGlyph><span>{label}</span>
      {mode === value && <span className="field-tool-current" aria-hidden>•</span>}
    </button>;
  };
  return <div data-quick-tools><div className="field-quick-grid">{TOOLS.filter(x => x.primary).map(render)}</div>
    <div className="field-quick-list">{TOOLS.filter(x => !x.primary).map(render)}</div>
    <button type="button" className="field-quick-row" onClick={() => { setMode('select'); setComment(true); onChoose(); }}><FigmaCommentIcon size={20} /><span>Comment</span></button>
    <button type="button" className="field-quick-row" onClick={() => { const root = getContentRoot(); if (root) zoomToFit(root); onChoose(); }}><FigmaFrameIcon size={20} /><span>Fit canvas</span></button>
    <button type="button" className="field-quick-row" onClick={() => { onChoose(); togglePalette(); }}><FigmaSearchIcon size={20} /><span>Search commands</span></button>
  </div>;
}

/** Middle-button release opens tools only after a stationary canvas gesture.
 * Middle drag still reaches the existing camera owner. Secondary click is untouched. */
export function DesktopQuickTools() {
  const presentation = useMobileWorkspacePresentation();
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const reduced = useFieldReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (presentation !== 'regular') { setPoint(null); return; }
    let down: { x: number; y: number; moved: boolean } | null = null;
    const canvas = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-canvas-root]')
      && !target.closest('input,textarea,select,a,[contenteditable="true"],[data-field-no-canvas-input]');
    const start = (e: MouseEvent) => { if (e.button === 1 && canvas(e.target)) { e.preventDefault(); down = { x: e.clientX, y: e.clientY, moved: false }; } };
    const move = (e: MouseEvent) => { if (down && movedPastTapSlop(e.clientX - down.x, e.clientY - down.y)) down.moved = true; };
    const end = (e: MouseEvent) => {
      if (e.button !== 1 || !down) return;
      const tap = !down.moved && !movedPastTapSlop(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (tap && canvas(e.target)) setPoint({ x: Math.max(12, Math.min(innerWidth - 292, e.clientX)), y: Math.max(12, Math.min(innerHeight - 470, e.clientY)) });
    };
    const aux = (e: MouseEvent) => { if (e.button === 1 && canvas(e.target)) e.preventDefault(); };
    const cancel = () => { down = null; };
    document.addEventListener('mousedown', start, true); document.addEventListener('mousemove', move, true);
    document.addEventListener('mouseup', end, true); document.addEventListener('auxclick', aux, true);
    window.addEventListener('blur', cancel);
    return () => { document.removeEventListener('mousedown', start, true); document.removeEventListener('mousemove', move, true); document.removeEventListener('mouseup', end, true); document.removeEventListener('auxclick', aux, true); window.removeEventListener('blur', cancel); };
  }, [presentation]);
  useEffect(() => {
    if (!point) return;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const outside = (e: PointerEvent) => { if (e.target instanceof Node && !ref.current?.contains(e.target)) setPoint(null); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setPoint(null); } };
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', key); };
  }, [point]);
  return <AnimatePresence>{point && <motion.div ref={ref} role="dialog" aria-label="Quick tools" data-field-no-canvas-input data-desktop-quick-tools
    className="field-desktop-quick-tools" style={{ left: point.x, top: point.y }}
    initial={reduced ? false : { opacity: 0, scale: .94, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
    transition={fieldSpatialTransition(reduced, fieldMotion.disclosure)}>
    <header><strong>Tools</strong><button type="button" aria-label="Close quick tools" onClick={() => setPoint(null)}>×</button></header>
    <QuickTools onChoose={() => setPoint(null)} />
  </motion.div>}</AnimatePresence>;
}
