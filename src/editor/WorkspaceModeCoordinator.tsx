import { useEffect, useLayoutEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { floatingEntranceAtom, floatingInspectorRevealedAtom, floatingLeftHiddenAtom, setWorkspaceModeAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { compactDockedInspectorOpenAtom, compactDockedLeftOpenAtom, floatingInspectorExpandedAtom, leftContentWidthAtom, rightPaneWidthAtom, LEFT_RAIL_WIDTH } from '@/code/stores/workspace-panels-store';

/** Normalize older per-pane saved preferences before the editor first paints. */
export default function WorkspaceModeCoordinator() {
  const mode = useAtomValue(workspaceModeAtom);
  const autoHide = useAtomValue(workspaceAutoHideAtom);
  const entrance = useAtomValue(floatingEntranceAtom);
  const setMode = useSetAtom(setWorkspaceModeAtom);
  const setEntrance = useSetAtom(floatingEntranceAtom);
  const setLeftHidden = useSetAtom(floatingLeftHiddenAtom);
  const setInspectorRevealed = useSetAtom(floatingInspectorRevealedAtom);
  const expanded = useAtomValue(floatingInspectorExpandedAtom);
  const setExpanded = useSetAtom(floatingInspectorExpandedAtom);
  const compactDockedLeftOpen = useAtomValue(compactDockedLeftOpenAtom);
  const compactDockedInspectorOpen = useAtomValue(compactDockedInspectorOpenAtom);
  const setCompactDockedLeftOpen = useSetAtom(compactDockedLeftOpenAtom);
  const setCompactDockedInspectorOpen = useSetAtom(compactDockedInspectorOpenAtom);
  const leftContentWidth = useAtomValue(leftContentWidthAtom);
  const rightPaneWidth = useAtomValue(rightPaneWidthAtom);
  useLayoutEffect(() => { setMode(mode === 'compact' ? 'floating' : mode); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mode !== 'floating' || !entrance) return;
    const timer = window.setTimeout(() => {
      if (autoHide) { setLeftHidden(true); setInspectorRevealed(false); }
      setEntrance(false);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [mode, autoHide, entrance, setEntrance, setLeftHidden, setInspectorRevealed]);
  useEffect(() => {
    if (mode !== 'floating') return;
    if (!autoHide) { setLeftHidden(false); setInspectorRevealed(false); return; }
    let idle: number | undefined;
    const reveal = () => {
      setLeftHidden(false);
      setInspectorRevealed(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => { setLeftHidden(true); setInspectorRevealed(false); }, 1800);
    };
    window.addEventListener('pointermove', reveal, { passive: true });
    idle = window.setTimeout(() => { setLeftHidden(true); setInspectorRevealed(false); }, 1800);
    return () => { window.removeEventListener('pointermove', reveal); window.clearTimeout(idle); };
  }, [mode, autoHide, setLeftHidden, setInspectorRevealed]);
  useEffect(() => {
    if (mode !== 'floating' || !expanded) return;
    let close: number | undefined;
    const move = (event: PointerEvent) => {
      window.clearTimeout(close);
      if (event.clientX < window.innerWidth - rightPaneWidth - 24 || event.clientY > Math.min(680, window.innerHeight - 12) + 12) {
        close = window.setTimeout(() => setExpanded(false), 220);
      }
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); window.clearTimeout(close); };
  }, [mode, expanded, rightPaneWidth, setExpanded]);
  useEffect(() => {
    if (mode !== 'compact-docked') return;
    let leftTimer: number | undefined;
    let rightTimer: number | undefined;
    const move = (event: PointerEvent) => {
      if (compactDockedLeftOpen) {
        window.clearTimeout(leftTimer);
        if (event.clientX > LEFT_RAIL_WIDTH + leftContentWidth + 12) {
          leftTimer = window.setTimeout(() => setCompactDockedLeftOpen(false), 220);
        }
      }
      if (compactDockedInspectorOpen) {
        window.clearTimeout(rightTimer);
        if (event.clientX < window.innerWidth - rightPaneWidth - 12) {
          rightTimer = window.setTimeout(() => setCompactDockedInspectorOpen(false), 220);
        }
      }
    };
    window.addEventListener('pointermove', move);
    return () => {
      window.removeEventListener('pointermove', move);
      window.clearTimeout(leftTimer);
      window.clearTimeout(rightTimer);
    };
  }, [mode, compactDockedLeftOpen, compactDockedInspectorOpen, leftContentWidth, rightPaneWidth, setCompactDockedLeftOpen, setCompactDockedInspectorOpen]);
  return null;
}
