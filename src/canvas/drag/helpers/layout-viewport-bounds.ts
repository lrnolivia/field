import { findNodeRect } from '@/canvas/node-ops';
import { getNodeFromCache } from '@/code/stores/store';
import type { Rect } from '@/shared/types';

/** Bound the page's rendered content even when the viewport root has a fixed or collapsed height. */
export function getLayoutViewportBounds(
  rootId: string,
  parentId: string | null,
  viewportId: string,
  liftedIds?: ReadonlySet<string>,
): Rect | null {
  const viewport = findNodeRect(rootId, viewportId);
  if (!viewport) return null;

  let { left, top } = viewport;
  let right = left + viewport.width, bottom = top + viewport.height;
  const include = (rect: Rect | null) => {
    if (!rect) return;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.left + rect.width);
    bottom = Math.max(bottom, rect.top + rect.height);
  };

  for (const id of getNodeFromCache(rootId)?.children ?? []) {
    // Lifted layers follow the pointer. Overlays and virtual children do not
    // define the visible extent of the page.
    if (liftedIds?.has(id) || id.startsWith('layout::') || getNodeFromCache(id)?.attrs?.['data-overlay']) continue;
    const rect = findNodeRect(id, viewportId);
    if (rect && (rect.width > 0 || rect.height > 0)) include(rect);
  }
  if (parentId && parentId !== rootId) include(findNodeRect(parentId, viewportId));

  return { left, top, width: right - left, height: bottom - top };
}
