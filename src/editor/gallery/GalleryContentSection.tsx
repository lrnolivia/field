import { useState } from 'react';
import { ToolButton, ToolSection } from '@/editor/controls';

export interface GalleryContentItem {
  itemId: string;
  imageId: string;
  src: string;
  alt: string;
  objectFit: string;
  objectPosition: string;
}

interface GalleryContentSectionProps {
  items: GalleryContentItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onAddMedia: () => void;
  onReplaceItem: (itemId: string) => void;
  onDuplicateItem: (itemId: string) => void;
  onMoveItem: (itemId: string, direction: -1 | 1) => void;
  onRemoveItem: (itemId: string) => void;
  onReorder: (fromItemId: string, toItemId: string) => void;
}

/**
 * Gallery's content authoring surface is intentionally independent from the
 * Design/view controls so future field Content mode can reuse it directly.
 */
export default function GalleryContentSection({
  items,
  selectedItemId,
  onSelectItem,
  onAddMedia,
  onReplaceItem,
  onDuplicateItem,
  onMoveItem,
  onRemoveItem,
  onReorder,
}: GalleryContentSectionProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const selectedIndex = items.findIndex((item) => item.itemId === selectedItemId);
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;

  return (
    <ToolSection
      title="Content"
      collapsible
      action={(
        <button
          type="button"
          onClick={onAddMedia}
          className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Add gallery media"
          title="Add media"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M6 2v8M2 6h8" />
          </svg>
        </button>
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <ToolButton onClick={onAddMedia}>Add media</ToolButton>
        <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-secondary)]">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </div>

      {items.length === 0 ? (
        <div className="min-h-16 border border-dashed border-[var(--control-border)] flex items-center justify-center text-center px-3 text-[11px] leading-snug text-[var(--text-secondary)]">
          Add images from project media or upload new media.
        </div>
      ) : (
        <div className="flex flex-col gap-1" data-gallery-item-list>
          {items.map((item, index) => {
            const active = selectedItemId === item.itemId;
            return (
              <div
                key={item.itemId}
                draggable
                onDragStart={() => setDraggedItemId(item.itemId)}
                onDragEnd={() => setDraggedItemId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedItemId) onReorder(draggedItemId, item.itemId);
                  setDraggedItemId(null);
                }}
                onClick={() => onSelectItem(item.itemId)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectItem(item.itemId);
                  }
                }}
                className={`group min-h-9 flex items-center gap-2 px-1.5 border cursor-default focus:outline-none focus:border-[var(--border-focus)] ${active ? 'border-[var(--border-focus)] bg-[var(--choice-bg)]' : 'border-transparent hover:bg-[var(--bg-hover)]'}`}
              >
                <span className="w-3 text-[9px] tabular-nums text-[var(--text-disabled)] text-right">{index + 1}</span>
                <div className="w-7 h-7 shrink-0 overflow-hidden bg-[var(--grid-line)] border border-[var(--control-border)]">
                  {item.src && <img src={item.src} alt="" className="w-full h-full object-cover" draggable={false} />}
                </div>
                <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-primary)]">{item.alt || 'Image'}</span>
                <span className="text-[10px] text-[var(--text-disabled)] opacity-0 group-hover:opacity-100">↕</span>
                <button
                  type="button"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={(event) => { event.stopPropagation(); onRemoveItem(item.itemId); }}
                  className={`w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedItem && (
        <div className="flex flex-col gap-1.5 pt-1" data-gallery-selected-item-actions>
          <div className="flex gap-1">
            <ToolButton className="flex-1" onClick={() => onReplaceItem(selectedItem.itemId)}>Replace</ToolButton>
            <ToolButton className="flex-1" onClick={() => onDuplicateItem(selectedItem.itemId)}>Duplicate</ToolButton>
          </div>
          <div className="flex items-center gap-1">
            <span className="min-w-0 flex-1 text-[10px] tabular-nums text-[var(--text-disabled)]">
              Item {selectedIndex + 1} of {items.length}
            </span>
            <button
              type="button"
              aria-label="Move selected image up"
              title="Move up"
              disabled={selectedIndex === 0}
              onClick={() => onMoveItem(selectedItem.itemId, -1)}
              className="w-6 h-6 flex items-center justify-center border border-[var(--control-border)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Move selected image down"
              title="Move down"
              disabled={selectedIndex === items.length - 1}
              onClick={() => onMoveItem(selectedItem.itemId, 1)}
              className="w-6 h-6 flex items-center justify-center border border-[var(--control-border)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label="Remove selected image"
              title="Remove"
              onClick={() => onRemoveItem(selectedItem.itemId)}
              className="h-6 px-2 border border-[var(--control-border)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </ToolSection>
  );
}
