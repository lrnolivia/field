import { useEffect, useLayoutEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { floatingEntranceAtom, floatingInspectorRevealedAtom, floatingInspectorSuppressedAtom, floatingLeftHiddenAtom, setWorkspaceModeAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { compactDockedInspectorOpenAtom, compactDockedLeftOpenAtom, compactInspectorOpenAtom, floatingInspectorExpandedAtom, leftContentWidthAtom, rightPaneOpenAtom, rightPaneWidthAtom, LEFT_RAIL_WIDTH } from '@/code/stores/workspace-panels-store';
import { selectedIdsAtom } from '@/code/stores/store';
import { groupEditingIdAtom, shapeEditingIdAtom } from '@/code/stores/shape-edit-store';
import { previewModeAtom } from '@/code/stores/editor-store';
import WorkspaceAutoHideButton from './WorkspaceAutoHideButton';

/** Normalize older per-pane saved preferences before the editor first paints. */
export default function WorkspaceModeCoordinator() {
  const mode = useAtomValue(workspaceModeAtom);
  const [autoHide, setAutoHide] = useAtom(workspaceAutoHideAtom);
  const entrance = useAtomValue(floatingEntranceAtom);
  const setMode = useSetAtom(setWorkspaceModeAtom);
  const setEntrance = useSetAtom(floatingEntranceAtom);
  const setLeftHidden = useSetAtom(floatingLeftHiddenAtom);
  const setInspectorRevealed = useSetAtom(floatingInspectorRevealedAtom);
  const expanded = useAtomValue(floatingInspectorExpandedAtom);
  const setExpanded = useSetAtom(floatingInspectorExpandedAtom);
  const compactDockedLeftOpen = useAtomValue(compactDockedLeftOpenAtom);
  const compactDockedInspectorOpen = useAtomValue(compactDockedInspectorOpenAtom);
  const compactInspectorOpen = useAtomValue(compactInspectorOpenAtom);
  const setCompactInspectorOpen = useSetAtom(compactInspectorOpenAtom);
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);
  const selectedIds = useAtomValue(selectedIdsAtom);
  const shapeEditingId = useAtomValue(shapeEditingIdAtom);
  const groupEditingId = useAtomValue(groupEditingIdAtom);
  const previewMode = useAtomValue(previewModeAtom);
  const setInspectorSuppressed = useSetAtom(floatingInspectorSuppressedAtom);
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
    if (mode !== 'docked') return;
    if (!autoHide) {
      setInspectorSuppressed(false);
      setInspectorRevealed(false);
      return;
    }

    let idle: number | undefined;
    const hide = () => {
      if (selectedIds.length === 0) setInspectorRevealed(false);
    };
    const move = (event: PointerEvent) => {
      const insideInspectorZone = event.clientX >= window.innerWidth - rightPaneWidth - 24;
      if (!insideInspectorZone) {
        window.clearTimeout(idle);
        idle = window.setTimeout(hide, 520);
        return;
      }
      setInspectorSuppressed(false);
      setInspectorRevealed(true);
      window.clearTimeout(idle);
    };
    window.addEventListener('pointermove', move, { passive: true });
    idle = window.setTimeout(hide, 900);
    return () => {
      window.removeEventListener('pointermove', move);
      window.clearTimeout(idle);
    };
  }, [mode, autoHide, rightPaneWidth, selectedIds.length, setInspectorRevealed, setInspectorSuppressed]);

  useEffect(() => {
    if (mode !== 'compact' || !autoHide || !compactInspectorOpen) return;
    let close: number | undefined;
    const move = (event: PointerEvent) => {
      window.clearTimeout(close);
      if (event.clientX < window.innerWidth - rightPaneWidth - 24) {
        close = window.setTimeout(() => setCompactInspectorOpen(false), 220);
      }
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.clearTimeout(close);
    };
  }, [mode, autoHide, compactInspectorOpen, rightPaneWidth, setCompactInspectorOpen]);

  useEffect(() => {
    const isTypingOrUsingControl = (target: EventTarget | null) => {
      const el = target instanceof HTMLElement ? target : null;
      if (!el) return false;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
      return !!el.closest('.ProseMirror, .monaco-editor, [data-code-editor], [data-modal-root], [role="dialog"], [role="menu"], [role="listbox"], select');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      if (previewMode || selectedIds.length > 0 || shapeEditingId || groupEditingId) return;
      if (document.querySelector('[data-modal-root]') || isTypingOrUsingControl(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'ArrowUp') setMode('floating');
      else if (event.key === 'ArrowDown') setMode('docked');
      else if (event.key === 'ArrowRight') setMode('compact-docked');
      else setAutoHide(!autoHide);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [autoHide, groupEditingId, previewMode, selectedIds.length, setAutoHide, setMode, shapeEditingId]);

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
      if (autoHide && compactDockedInspectorOpen) {
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
  }, [mode, autoHide, compactDockedLeftOpen, compactDockedInspectorOpen, leftContentWidth, rightPaneWidth, setCompactDockedLeftOpen, setCompactDockedInspectorOpen]);

  if (previewMode || mode === 'floating' || !rightPaneOpen) return null;
  return <div className="fixed z-[10003]" style={{ top: 56, right: mode === 'compact-docked' ? 64 : mode === 'compact' ? 16 : 8 }}>
    <WorkspaceAutoHideButton side="right" />
  </div>;
}
