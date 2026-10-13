import { useEffect, useLayoutEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { mobileFocusActiveAtom, rightPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { floatingPanelCollapsedAtom } from './workspace-mode-store';
import { toolbarPanelAtom } from './toolbar-panel-store';
import { useMobileWorkspacePresentation } from './mobile-workspace-presentation';

export default function MobileFocusCoordinator() {
  const presentation = useMobileWorkspacePresentation();
  const mobile = presentation !== 'regular';
  const setMobile = useSetAtom(mobileFocusActiveAtom);
  const leftCollapsed = useAtomValue(floatingPanelCollapsedAtom);
  const collapseLeft = useSetAtom(floatingPanelCollapsedAtom);
  const rightOpen = useAtomValue(rightPaneOpenAtom);
  const setRightOpen = useSetAtom(rightPaneOpenAtom);
  const toolbarPanel = useAtomValue(toolbarPanelAtom);
  const setToolbarPanel = useSetAtom(toolbarPanelAtom);
  const previous = useRef({ leftCollapsed, rightOpen, toolbarPanel });

  useLayoutEffect(() => { setMobile(mobile); }, [mobile, setMobile]);

  useEffect(() => {
    const old = previous.current;
    previous.current = { leftCollapsed, rightOpen, toolbarPanel };
    if (!mobile) return;
    // Opening one host dismisses the other hosts; selection remains shared.
    if (toolbarPanel && toolbarPanel !== old.toolbarPanel) {
      collapseLeft(true);
      if (rightOpen) setRightOpen(false);
    } else if (!leftCollapsed && old.leftCollapsed) {
      setToolbarPanel(null);
      if (rightOpen) setRightOpen(false);
    } else if (rightOpen && !old.rightOpen) {
      collapseLeft(true);
      setToolbarPanel(null);
    }
  }, [mobile, leftCollapsed, rightOpen, toolbarPanel, collapseLeft, setRightOpen, setToolbarPanel]);

  useLayoutEffect(() => {
    if (!mobile) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const sync = () => {
      const visibleHeight = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      root.style.setProperty('--field-visible-height', `${visibleHeight}px`);
      root.style.setProperty('--field-visible-bottom', `${Math.max(0, window.innerHeight - visibleHeight - offsetTop)}px`);
    };
    sync();
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      root.style.removeProperty('--field-visible-height');
      root.style.removeProperty('--field-visible-bottom');
    };
  }, [mobile]);
  return null;
}
