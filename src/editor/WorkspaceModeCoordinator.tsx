import { useEffect, useLayoutEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { floatingEntranceAtom, floatingLeftHiddenAtom, floatingPanelCollapsedAtom, setWorkspaceModeAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { LEFT_RAIL_WIDTH, leftContentWidthAtom, leftPaneOpenAtom, rightInspectorAutoHideAtom, rightInspectorExplicitCollapseAtom, rightInspectorTemporaryRevealAtom, rightPaneWidthAtom } from '@/code/stores/workspace-panels-store';
import { selectedIdsAtom } from '@/code/stores/store';
import { groupEditingIdAtom, shapeEditingIdAtom } from '@/code/stores/shape-edit-store';
import { previewModeAtom } from '@/code/stores/editor-store';

/** Floating interaction semantics are canonical; docked modes only change wrapper geometry. */
export default function WorkspaceModeCoordinator() {
  const mode = useAtomValue(workspaceModeAtom);
  const [autoHide, setAutoHide] = useAtom(workspaceAutoHideAtom);
  const entrance = useAtomValue(floatingEntranceAtom);
  const setMode = useSetAtom(setWorkspaceModeAtom);
  const setEntrance = useSetAtom(floatingEntranceAtom);
  const setLeftHidden = useSetAtom(floatingLeftHiddenAtom);
  const leftExpanded = useAtomValue(leftPaneOpenAtom);
  const floatingLeftCollapsed = useAtomValue(floatingPanelCollapsedAtom);
  const leftContentWidth = useAtomValue(leftContentWidthAtom);
  const rightAutoHide = useAtomValue(rightInspectorAutoHideAtom);
  const explicitlyCollapsed = useAtomValue(rightInspectorExplicitCollapseAtom);
  const temporaryReveal = useAtomValue(rightInspectorTemporaryRevealAtom);
  const setTemporaryReveal = useSetAtom(rightInspectorTemporaryRevealAtom);
  const rightPaneWidth = useAtomValue(rightPaneWidthAtom);
  const selectedIds = useAtomValue(selectedIdsAtom);
  const shapeEditingId = useAtomValue(shapeEditingIdAtom);
  const groupEditingId = useAtomValue(groupEditingIdAtom);
  const previewMode = useAtomValue(previewModeAtom);

  // Only migrate the retired floating Compact preset. Restoring a docked
  // preset must leave its separately persisted pane choices untouched.
  useLayoutEffect(() => {
    if (mode === 'compact') setMode('floating');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'floating' || !entrance) return;
    const timer = window.setTimeout(() => {
      if (autoHide) setLeftHidden(true);
      setEntrance(false);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [mode, autoHide, entrance, setEntrance, setLeftHidden]);

  useEffect(() => {
    const sharedMode = mode === 'docked' || mode === 'floating' || mode === 'compact-docked';
    if (!sharedMode) return;
    if (!autoHide) {
      setLeftHidden(false);
      return;
    }
    let idle: number | undefined;
    const visibleWidth = LEFT_RAIL_WIDTH + ((mode === 'floating' ? !floatingLeftCollapsed : leftExpanded) ? leftContentWidth : 0) + 24;
    const move = (event: PointerEvent) => {
      window.clearTimeout(idle);
      if (event.clientX <= 8) { setLeftHidden(false); return; }
      if (event.clientX > visibleWidth) idle = window.setTimeout(() => setLeftHidden(true), 220);
    };
    window.addEventListener('pointermove', move, { passive: true });
    idle = window.setTimeout(() => setLeftHidden(true), 1800);
    return () => { window.removeEventListener('pointermove', move); window.clearTimeout(idle); };
  }, [mode, autoHide, leftExpanded, floatingLeftCollapsed, leftContentWidth, setLeftHidden]);

  useEffect(() => {
    if (!rightAutoHide) return;
    let close: number | undefined;
    const move = (event: PointerEvent) => {
      window.clearTimeout(close);
      if (event.clientX >= window.innerWidth - 8) { setTemporaryReveal(true); return; }
      if (temporaryReveal && event.clientX < window.innerWidth - rightPaneWidth - 24 && selectedIds.length === 0)
        close = window.setTimeout(() => setTemporaryReveal(false), 220);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); window.clearTimeout(close); };
  }, [rightAutoHide, rightPaneWidth, selectedIds.length, temporaryReveal, setTemporaryReveal]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      if (mode === 'floating' && !rightAutoHide) setTemporaryReveal(false);
      return;
    }
    if (!explicitlyCollapsed && (mode === 'floating' || rightAutoHide)) setTemporaryReveal(true);
  }, [mode, rightAutoHide, explicitlyCollapsed, selectedIds, setTemporaryReveal]);

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

  return null;
}
