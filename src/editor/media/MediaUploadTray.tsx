import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  clearFinishedMediaUploadsAtom,
  mediaUploadQueueAtom,
  removeMediaUploadAtom,
} from './media-state';
import type { MediaUploadItem } from './media-system';

const ACTIVE_STATUSES = new Set<MediaUploadItem['status']>(['queued', 'uploading', 'processing']);

function statusLabel(item: MediaUploadItem): string {
  switch (item.status) {
    case 'queued': return 'Queued';
    case 'uploading': return item.progress > 0 && item.progress < 1
      ? Math.round(item.progress * 100) + '%'
      : 'Uploading…';
    case 'processing': return 'Preparing…';
    case 'complete': return item.reusedExisting ? 'Already in Media · using existing' : 'Added';
    case 'error': return item.error || 'Upload failed';
    case 'cancelled': return 'Cancelled';
  }
}

function kindGlyph(item: MediaUploadItem): string {
  switch (item.kind) {
    case 'video': return '▶';
    case 'audio': return '♫';
    case 'vector': return '◇';
    default: return '▣';
  }
}

export default function MediaUploadTray() {
  const queue = useAtomValue(mediaUploadQueueAtom);
  const remove = useSetAtom(removeMediaUploadAtom);
  const clearFinished = useSetAtom(clearFinishedMediaUploadsAtom);
  const [expanded, setExpanded] = useState(true);
  const previousActive = useRef(0);

  const activeCount = useMemo(
    () => queue.filter((item) => ACTIVE_STATUSES.has(item.status)).length,
    [queue],
  );
  const errorCount = useMemo(
    () => queue.filter((item) => item.status === 'error').length,
    [queue],
  );
  const completeCount = useMemo(
    () => queue.filter((item) => item.status === 'complete').length,
    [queue],
  );
  const reusedCount = useMemo(
    () => queue.filter((item) => item.status === 'complete' && item.reusedExisting).length,
    [queue],
  );
  const addedCount = completeCount - reusedCount;

  useEffect(() => {
    if (activeCount > 0) {
      setExpanded(true);
      previousActive.current = activeCount;
      return;
    }

    if (previousActive.current > 0 && errorCount === 0 && completeCount > 0) {
      previousActive.current = 0;
      const timer = window.setTimeout(() => setExpanded(false), 1400);
      return () => window.clearTimeout(timer);
    }

    previousActive.current = activeCount;
  }, [activeCount, errorCount, completeCount]);

  if (queue.length === 0) return null;

  if (!expanded && activeCount === 0 && errorCount === 0) {
    return (
      <div
        data-media-upload-tray="collapsed"
        className="fixed bottom-[72px] right-4 z-[14970] flex items-center gap-1.5 rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-2.5 py-2 text-[10px] text-[var(--text-secondary)] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        aria-live="polite"
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 text-[var(--text-primary)]"
        >
          <span aria-hidden>✓</span>
          <span>
            {addedCount > 0 && reusedCount > 0
              ? addedCount + ' added · ' + reusedCount + ' reused'
              : reusedCount > 0
                ? reusedCount + ' reused'
                : addedCount + ' ' + (addedCount === 1 ? 'media item' : 'media items') + ' added'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => clearFinished()}
          className="ml-1 rounded-[3px] px-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <section
      data-media-upload-tray="expanded"
      aria-label="Media uploads"
      aria-live="polite"
      className="fixed bottom-[72px] right-4 z-[14970] w-[320px] overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[0_14px_36px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.06)]"
    >
      <header className="flex h-9 items-center gap-2 border-b border-[var(--border-light)] bg-[var(--bg-surface)]/35 px-2.5">
        <strong className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[var(--text-primary)]">
          {activeCount > 0 ? 'Uploading ' + activeCount : errorCount > 0 ? 'Media uploads' : 'Uploads complete'}
        </strong>
        {activeCount === 0 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-[3px] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            Collapse
          </button>
        )}
      </header>

      <div className="max-h-[264px] overflow-y-auto">
        {queue.map((item) => {
          const removable = !ACTIVE_STATUSES.has(item.status);
          return (
            <div
              key={item.id}
              data-media-upload-row
              data-status={item.status}
              className="relative flex min-h-12 items-center gap-2.5 border-b border-[var(--border-light)] px-2.5 py-2 last:border-b-0"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-hover)]/45 text-[11px] text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                aria-hidden
              >
                {kindGlyph(item)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-medium text-[var(--text-primary)]">
                  {item.name}
                </span>
                <span className={item.status === 'error'
                  ? 'block truncate text-[9px] text-red-500'
                  : 'block truncate text-[9px] text-[var(--text-tertiary)]'}
                >
                  {statusLabel(item)}
                </span>
              </span>
              {removable && (
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label={'Remove ' + item.name + ' from upload history'}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[12px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                >
                  ×
                </button>
              )}
              {(item.status === 'uploading' || item.status === 'processing') && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-[var(--border-light)]"
                >
                  <span
                    className="block h-full bg-[var(--accent)] transition-[width] duration-150"
                    style={{ width: item.progress > 0 ? Math.max(4, Math.min(100, item.progress * 100)) + '%' : '18%' }}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
