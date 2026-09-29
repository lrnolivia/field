import { useEffect, useLayoutEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { floatingEntranceAtom, floatingInspectorRevealedAtom, floatingInspectorSuppressedAtom, floatingLeftHiddenAtom, setWorkspaceModeAtom, workspaceAutoHideAtom, workspaceModeAtom } from './workspace-mode-store';
import { floatingInspectorExpandedAtom, rightPaneOpenAtom, rightPaneWidthAtom } from '@/code/stores/workspace-panels-store';
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
  const setInspectorRevealed = useSetAtom(floatingInspectorRevealedAtom);
  const setInspectorSuppressed = useSetAtom(floatingInspectorSuppressedAtom);
  const expanded = useAtomValue(floatingInspectorExpandedAtom);
  const setExpanded = useSetAtom(floatingInspectorExpandedAtom);
  const setRightPaneOpen = useSetAtom(rightPaneOpenAtom);
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
      if (autoHide) { setLeftHidden(true); setInspectorRevealed(false); }
      setEntrance(false);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [mode, autoHide, entrance, setEntrance, setLeftHidden, setInspectorRevealed]);

  useEffect(() => {
    const sharedMode = mode === 'docked' || mode === 'floating' || mode === 'compact-docked';
    if (!sharedMode) return;
    if (!autoHide) {
      setLeftHidden(false);
      setInspectorSuppressed(false);
      setInspectorRevealed(false);
      return;
    }
    let idle: number | undefined;
    const reveal = () => {
      setLeftHidden(false);
      setInspectorSuppressed(false);
      setInspectorRevealed(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => { setLeftHidden(true); setInspectorRevealed(false); }, 1800);
    };
    window.addEventListener('pointermove', reveal, { passive: true });
    idle = window.setTimeout(() => { setLeftHidden(true); setInspectorRevealed(false); }, 1800);
    return () => { window.removeEventListener('pointermove', reveal); window.clearTimeout(idle); };
  }, [mode, autoHide, setInspectorRevealed, setInspectorSuppressed, setLeftHidden]);

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
    if (selectedIds.length === 0) return;
    setInspectorSuppressed(false);
    if (mode === 'floating') setRightPaneOpen(true);
  }, [mode, selectedIds, setInspectorSuppressed, setRightPaneOpen]);

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
