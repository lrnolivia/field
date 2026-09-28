import { useEffect, useLayoutEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { floatingEntranceAtom, floatingInspectorRevealedAtom, floatingLeftHiddenAtom, setWorkspaceModeAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { compactDockedInspectorOpenAtom, compactDockedLeftOpenAtom, leftContentWidthAtom, rightPaneWidthAtom, LEFT_RAIL_WIDTH } from '@/code/stores/workspace-panels-store';

/** Normalize older per-pane saved preferences before the editor first paints. */
export default function WorkspaceModeCoordinator() {
  const mode = useAtomValue(workspaceModeAtom);
  const autoHide = useAtomValue(workspaceAutoHideAtom);
  const entrance = useAtomValue(floatingEntranceAtom);
  const setMode = useSetAtom(setWorkspaceModeAtom);
  const setEntrance = useSetAtom(floatingEntranceAtom);
  const setLeftHidden = useSetAtom(floatingLeftHiddenAtom);
  const setInspectorRevealed = useSetAtom(floatingInspectorRevealedAtom);
  const compactDockedLeftOpen = useAtomValue(compactDockedLeftOpenAtom);
  const compactDockedInspectorOpen = useAtomValue(compactDockedInspectorOpenAtom);
  const setCompactDockedLeftOpen = useSetAtom(compactDockedLeftOpenAtom);
  const setCompactDockedInspectorOpen = useSetAtom(compactDockedInspectorOpenAtom);
  const leftContentWidth = useAtomValue(leftContentWidthAtom);
  const rightPaneWidth = useAtomValue(rightPaneWidthAtom);
  useLayoutEffect(() => { setMode(mode); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mode !== 'floating' || !entrance) return;
    if (!autoHide) { setEntrance(false); return; }
    const timer = window.setTimeout(() => {
      setLeftHidden(true);
      setInspectorRevealed(false);
      setEntrance(false);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [mode, autoHide, entrance, setEntrance, setLeftHidden, setInspectorRevealed]);
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
