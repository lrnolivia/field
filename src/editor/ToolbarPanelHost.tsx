import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useAtom } from 'jotai';
import { toolbarPanelAtom, type ToolbarPanel } from '@/editor/toolbar-panel-store';
import LibraryPanel from '@/editor/left-toolbar/panels/LibraryPanel';
import { SecondaryPanelContent } from '@/editor/left-toolbar/panels/insert';
import { CATEGORIES, CREATIVE_CATEGORIES } from '@/shared/insert-items/element-data';
import ModalCloseButton from '@/design-system/ModalCloseButton';
import MediaPanelController from '@/editor/media/MediaPanelController';
import { LEFT_RAIL_WIDTH } from '@/code/stores/workspace-panels-store';
import { useMobileWorkspacePresentation } from '@/editor/mobile-workspace-presentation';

const LIBRARY_TITLES = {
  components: 'Components', vectors: 'Vectors', templates: 'Templates',
  'code-overrides': 'Code Overrides', plugins: 'Plugins',
};

function toolbarPanelOriginTool(panel: ToolbarPanel): string {
  if (panel.kind === 'library') return 'library';
  if (panel.kind === 'media') return 'media';
  if (panel.kind === 'insert') {
    if (panel.category === 'creative-text-effects') return 'text';
    if (panel.category === 'elements') return 'frame';
  }
  return 'frame';
}

export default function ToolbarPanelHost() {
  const [panel, setPanel] = useAtom(toolbarPanelAtom);
  const mobilePresentation = useMobileWorkspacePresentation();
  const portraitSheet = mobilePresentation === 'portrait-sheet';
  const landscapeOverlay = mobilePresentation === 'landscape-overlay';
  const mobilePanel = mobilePresentation !== 'regular';
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: 480, height: 560 });
  const [peeked, setPeeked] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [originArrow, setOriginArrow] = useState(240);
  const [anchoredToToolbar, setAnchoredToToolbar] = useState(true);
  useLayoutEffect(() => {
    if (!panel) return;
    const nextSize = { width: 480, height: 560 };
    setSize(nextSize);
    setPeeked(false);

    if (mobilePanel) {
      setPosition(null);
      setAnchoredToToolbar(false);
      return;
    }

    const tool = document.querySelector(`[data-toolbar-tool="${toolbarPanelOriginTool(panel)}"]`) as HTMLElement | null;
    const width = Math.min(nextSize.width, window.innerWidth - 24);
    const height = Math.min(nextSize.height, window.innerHeight - 96);
    if (!tool) {
      setPosition({ x: Math.max(12, (window.innerWidth - width) / 2), y: Math.max(12, (window.innerHeight - height) / 2) });
      setOriginArrow(width / 2);
      setAnchoredToToolbar(false);
      return;
    }

    const rect = tool.getBoundingClientRect();
    const x = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
    const y = Math.max(12, rect.top - height - 12);
    setPosition({ x, y });
    setOriginArrow(rect.left + rect.width / 2 - x);
    setAnchoredToToolbar(true);
  }, [panel, mobilePanel]);
  useEffect(() => {
    if (!panel || (panel.kind !== 'insert' && panel.kind !== 'library')) return;
    const closeAfterInsert = () => setPanel(null);
    window.addEventListener('field:insert-complete', closeAfterInsert);
    return () => window.removeEventListener('field:insert-complete', closeAfterInsert);
  }, [panel, setPanel]);
  useEffect(() => {
    if (!panel || panel.kind === 'media') return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); setPanel(null); }
      if (mobilePanel || peeked) return;
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? [])].filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) { event.preventDefault(); dialogRef.current?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); previous?.focus(); };
  }, [panel, setPanel, peeked, mobilePanel]);

  if (!panel) return null;
  if (panel.kind === 'media') return <MediaPanelController onClose={() => { setPanel(null); if (portraitSheet) window.dispatchEvent(new Event('field:portrait-close')); }} />;
  if (portraitSheet) return null; // Dedicated portrait workspace owns these tasks.
  const category = panel.kind === 'insert'
    ? panel.categoryData ?? [...CATEGORIES, ...CREATIVE_CATEGORIES].find((entry) => entry.id === panel.category)
    : null;
  const title = panel.kind === 'library' ? LIBRARY_TITLES[panel.section]
    : panel.section ? category?.sections.find((entry) => entry.id === panel.section)?.label ?? category?.label
      : category?.label ?? 'Insert';

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mobilePanel || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchoredToToolbar(false);
    event.preventDefault();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const onMove = (move: PointerEvent) => {
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - rect.width - 8, move.clientX - offsetX)),
        y: Math.max(8, Math.min(window.innerHeight - rect.height - 8, move.clientY - offsetY)),
      });
    };
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mobilePanel) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ x: rect.left, y: rect.top });
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;
    const move = (next: PointerEvent) => {
      setSize({
        width: Math.max(340, Math.min(window.innerWidth - rect.left - 8, startWidth + next.clientX - startX)),
        height: Math.max(300, Math.min(window.innerHeight - rect.top - 8, startHeight + next.clientY - startY)),
      });
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
    document.body.style.cursor = 'nwse-resize';
  };

  const peekAtTop = () => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ x: rect.left, y: rect.top });
    setSize({ width: rect.width, height: rect.height });
    setPeeked(true);
    dialogRef.current?.blur();
  };

  return createPortal(
    <div className="field-toolbar-panel-backdrop fixed inset-0 z-[15000] bg-transparent"
      data-modal-root={mobilePanel || peeked ? undefined : ''} data-toolbar-panel-backdrop
      data-mobile-panel-presentation={mobilePanel ? mobilePresentation : undefined}
      style={{ pointerEvents: mobilePanel || peeked ? 'none' : 'auto' }}
      onPointerDown={(event) => {
        if (!mobilePanel && event.target === event.currentTarget && !peeked) peekAtTop();
      }}>
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={!mobilePanel && !peeked}
        aria-label={title}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.75 }}
        data-toolbar-panel={panel.kind}
        data-peeked={peeked ? 'true' : 'false'}
        className="field-toolbar-panel-surface fixed flex flex-col overflow-hidden rounded-[11px] bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-[0_18px_52px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08)] outline-none"
        style={{
          width: portraitSheet
            ? 'calc(100vw - 16px)'
            : landscapeOverlay ? 'min(360px, 42vw)' : `min(${size.width}px, calc(100vw - 32px))`,
          height: portraitSheet
            ? 'min(520px, calc(var(--field-visible-height, 100dvh) - 140px))'
            : landscapeOverlay ? 'calc(100dvh - 80px)' : `min(${size.height}px, calc(100vh - 32px))`,
          left: portraitSheet
            ? 8
            : landscapeOverlay ? 12 + LEFT_RAIL_WIDTH : position?.x ?? '50%',
          right: portraitSheet ? 8 : undefined,
          top: portraitSheet
            ? 'auto'
            : landscapeOverlay ? 68 : peeked ? 32 - size.height : position?.y ?? '50%',
          bottom: portraitSheet
            ? 'calc(72px + env(safe-area-inset-bottom, 0px) + var(--field-visible-bottom, 0px))'
            : undefined,
          transform: mobilePanel ? 'none' : position ? 'none' : 'translate(-50%, -50%)',
          transformOrigin: mobilePanel
            ? 'center'
            : anchoredToToolbar
              ? `${Math.max(18, Math.min(originArrow, size.width - 18))}px calc(100% + 7px)`
              : 'center',
          pointerEvents: 'auto',
        }}>
        {portraitSheet && (
          <div aria-hidden className="absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full bg-[var(--text-disabled)] opacity-70" />
        )}
        <div className={`flex h-11 shrink-0 select-none items-center gap-2 border-b border-[var(--border-light)] px-4 ${mobilePanel ? 'cursor-default' : 'cursor-move'}`}
          onPointerDown={startDrag}>
          <span className="text-[var(--text-secondary)]" aria-hidden>▦</span>
          <h2 className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</h2>
          <ModalCloseButton onClick={() => setPanel(null)} label={`Close ${title}`} />
        </div>
        <div data-toolbar-panel-resize onPointerDown={startResize} title="Resize panel"
          className={`absolute bottom-0 right-0 z-10 flex h-4 w-4 cursor-nwse-resize items-end justify-end ${peeked || mobilePanel ? 'hidden' : ''}`}>
          <svg aria-hidden width="9" height="9" viewBox="0 0 9 9" className="mb-[3px] mr-[3px] text-[var(--text-disabled)]"><path d="M8 1 1 8M8 5 5 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {panel.kind === 'library' && <LibraryPanel mode="library" focusSection={panel.section} />}
          {panel.kind === 'insert' && category && <div className="flex h-full min-h-0 flex-col"><SecondaryPanelContent category={category} sectionId={panel.section} /></div>}
        </div>
        {!mobilePanel && anchoredToToolbar && !peeked && (
          <span
            data-toolbar-panel-origin-pointer
            aria-hidden
            className="absolute -bottom-[6px] h-[10px] w-[10px] rotate-45 border-b border-r border-[var(--border-light)] bg-[var(--bg-panel)]"
            style={{ left: Math.max(14, Math.min(originArrow - 5, size.width - 24)) }}
          />
        )}
        {peeked && <button type="button" data-toolbar-panel-peek onClick={() => { setPeeked(false); dialogRef.current?.focus(); }}
          className="field-toolbar-panel-peek absolute bottom-0 left-0 z-20 flex h-8 w-full items-center justify-center gap-2 border-t border-[var(--border-light)] bg-[var(--bg-panel)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <span aria-hidden>⌄</span><span>{title}</span>
        </button>}
      </motion.div>
    </div>, document.body,
  );
}

