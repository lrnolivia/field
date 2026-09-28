import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAtom } from 'jotai';
import { toolbarPanelAtom } from '@/editor/toolbar-panel-store';
import LibraryPanel from '@/editor/left-toolbar/panels/LibraryPanel';
import MediaGalleryPanel from '@/editor/left-toolbar/panels/MediaGalleryPanel';
import { SecondaryPanelContent } from '@/editor/left-toolbar/panels/insert';
import { CATEGORIES, CREATIVE_CATEGORIES } from '@/shared/insert-items/element-data';

const LIBRARY_TITLES = {
  components: 'Components', vectors: 'Vectors', templates: 'Templates',
  'code-overrides': 'Code Overrides', plugins: 'Plugins',
};

export default function ToolbarPanelHost() {
  const [panel, setPanel] = useAtom(toolbarPanelAtom);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPosition(null); }, [panel]);
  useEffect(() => {
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); setPanel(null); }
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
  }, [panel, setPanel]);

  if (!panel) return null;
  const category = panel.kind === 'insert'
    ? panel.categoryData ?? [...CATEGORIES, ...CREATIVE_CATEGORIES].find((entry) => entry.id === panel.category)
    : null;
  const title = panel.kind === 'library' ? LIBRARY_TITLES[panel.section]
    : panel.kind === 'media-gallery' ? 'Media Gallery'
      : panel.section ? category?.sections.find((entry) => entry.id === panel.section)?.label ?? category?.label
        : category?.label ?? 'Insert';

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
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

  return createPortal(
    <div className="fixed inset-0 z-[15000] bg-black/35" data-toolbar-panel-backdrop
      onPointerDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        data-toolbar-panel={panel.kind}
        className="fixed flex flex-col overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-[var(--shadow-lg)] outline-none"
        style={{
          width: 'min(480px, calc(100vw - 32px))',
          height: 'min(680px, calc(100vh - 32px))',
          left: position?.x ?? '50%', top: position?.y ?? '50%',
          transform: position ? 'none' : 'translate(-50%, -50%)',
        }}>
        <div className="flex h-11 shrink-0 cursor-move select-none items-center gap-2 border-b border-[var(--border-light)] px-4"
          onPointerDown={startDrag}>
          <span className="text-[var(--text-secondary)]" aria-hidden>▦</span>
          <h2 className="min-w-0 flex-1 truncate text-xs font-semibold">{title}</h2>
          <button type="button" aria-label={`Close ${title}`} onClick={() => setPanel(null)}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {panel.kind === 'library' && <LibraryPanel mode="library" focusSection={panel.section} />}
          {panel.kind === 'media-gallery' && <MediaGalleryPanel />}
          {panel.kind === 'insert' && category && <div className="flex h-full flex-col"><SecondaryPanelContent category={category} sectionId={panel.section} /></div>}
        </div>
      </div>
    </div>, document.body,
  );
}
