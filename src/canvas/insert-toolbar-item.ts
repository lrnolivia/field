// Click insertion for the shared Insert catalogue. Drag continues to use
// ToolbarDragStrategy; both paths consume the same ToolbarItem definitions.

import type { ToolbarItem } from '@/canvas/drag/toolbar-item-config';
import { getToolbarItemConfig } from '@/canvas/drag/toolbar-item-config';
import { insertNodes } from '@/canvas/insertion-bridge';
import { insertSectionBlueprint } from '@/canvas/section-insert';
import { getActiveFilePath, getContentRoot } from '@/canvas/node-ops';
import { modifyProjectFile } from '@/code/project/modify-file';
import { generateNodeId } from '@/shared/id-utils';
import type { NewNodeDescriptor } from '@/shared/types';
import type { ClipboardNode } from '@/code/features/paste-engine/types';
import { trace } from '@/shared/debug-trace';
import { toast } from 'sonner';

/** The inserted node may render a few frames after the source mutation lands. */
function playInsertionPop(ids: string[]): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const pending = new Set(ids);
  let frames = 0;
  const tryAnimate = () => {
    const root = getContentRoot();
    for (const id of pending) {
      const element = root?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
      if (!element || typeof element.animate !== 'function') continue;
      const opacity = getComputedStyle(element).opacity;
      element.animate([
        { opacity: 0, scale: '0.92', filter: 'blur(3px)', offset: 0 },
        { opacity: opacity || 1, scale: '1.045', filter: 'blur(0)', offset: 0.72 },
        { opacity: opacity || 1, scale: '1', filter: 'blur(0)', offset: 1 },
      ], { duration: 290, easing: 'cubic-bezier(.18,.8,.25,1)', fill: 'none' });
      pending.delete(id);
    }
    if (pending.size > 0 && frames++ < 15) requestAnimationFrame(tryAnimate);
  };
  requestAnimationFrame(tryAnimate);
}

function ensureCdnImport(componentName: string, url: string): void {
  modifyProjectFile(getActiveFilePath(), (code) => {
    if (code.includes(url) || new RegExp(`import\\s+${componentName}\\s+from`).test(code)) return code;
    const lines = code.split('\n');
    let lastImport = -1;
    for (let index = 0; index < lines.length; index++) {
      if (/^\s*import\s+/.test(lines[index])) lastImport = index;
      else if (lastImport >= 0 && lines[index].trim() !== '') break;
    }
    lines.splice(lastImport + 1, 0, `import ${componentName} from "${url}";`);
    return lines.join('\n');
  });
}

/** Build fresh, editable paste nodes from the same tree used by a drag. */
export function toolbarItemToClipboardNodes(item: ToolbarItem): ClipboardNode[] {
  const root: NewNodeDescriptor = {
    tag: item.elementType,
    name: item.name,
    styles: { ...item.defaultStyles },
    attrs: item.defaultAttrs ? { ...item.defaultAttrs } : undefined,
    textContent: item.textContent,
    children: item.children?.(),
  };
  const nodes: ClipboardNode[] = [];
  const walk = (descriptor: NewNodeDescriptor, parentId: string | null, order: number) => {
    const id = descriptor.id ?? generateNodeId(descriptor.tag.toLowerCase());
    const children = descriptor.children ?? [];
    const childIds = children.map((child) => child.id ?? generateNodeId(child.tag.toLowerCase()));
    nodes.push({
      id,
      type: descriptor.tag,
      parentId,
      children: childIds,
      order,
      styles: { ...descriptor.styles },
      attrs: descriptor.attrs ? { ...descriptor.attrs } : undefined,
      name: descriptor.name,
      textContent: descriptor.textContent,
      isCanvasNode: false,
      ...(parentId === null ? { computedDimensions: {
        width: item.defaultStyles.width ?? `${item.ghostSize.width}px`,
        height: item.defaultStyles.height ?? `${item.ghostSize.height}px`,
      } } : {}),
    });
    children.forEach((child, index) => walk({ ...child, id: childIds[index] }, id, index));
  };
  walk(root, null, 0);
  return nodes;
}

/** Click a catalogue tile to place it at the visible canvas center. */
export function insertToolbarItemAtVisibleCenter(itemId: string, sectionBlueprintId?: string): string[] {
  if (sectionBlueprintId) {
    const created = insertSectionBlueprint(sectionBlueprintId);
    playInsertionPop(created);
    return created;
  }
  const item = getToolbarItemConfig(itemId);
  if (!item) {
    toast.error('This item is unavailable right now.');
    return [];
  }
  // Collection lists need ToolbarDragStrategy's post-add binding path.
  if (itemId.startsWith('cms:')) {
    toast.info('Drag this item onto the canvas to place it with its connection.');
    return [];
  }
  if (item.cdnUrl) ensureCdnImport(item.elementType, item.cdnUrl);
  const created = insertNodes(toolbarItemToClipboardNodes(item), { ignoreSelection: true });
  playInsertionPop(created);
  trace.action('insert-panel:click-insert', { itemId, created });
  return created;
}
