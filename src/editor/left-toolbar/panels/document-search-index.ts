import { parseJSXToNodes } from '@/code/parsing/parser';
import { parseJSX } from '@/code/parsing/ast-utils';

export interface DocumentSearchItem {
  key: string;
  kind: 'page' | 'layer';
  file: string;
  label: string;
  context: string;
  nodeId?: string;
  searchText: string;
}

/** Index source-owned page layers. Shared template/component interiors have
 * their own editors; expanding them here would imply a false page ownership. */
export function indexPageSource(file: string, code: string, label: string, includePage = true): DocumentSearchItem[] {
  const items: DocumentSearchItem[] = includePage ? [{ key: file, kind: 'page', file, label,
    context: file, searchText: `${label} ${file}`.toLocaleLowerCase() }] : [];
  const nodes = parseJSXToNodes(code);
  // The canvas parser tolerates syntax failures with an empty map. Distinguish
  // those from a valid empty page so search can disclose incomplete coverage.
  if (nodes.size === 0 && !parseJSX(code)) throw new Error(`Cannot index layers in ${file}`);
  for (const node of nodes.values()) {
    // Missing authored IDs are healed on navigation. Never offer an unstable
    // auto ID as a cross-page selection target.
    if (node.id.startsWith('auto_') || node.type === 'style' || node.componentInstanceId) continue;
    const ancestors: string[] = [];
    const seen = new Set([node.id]);
    let parent = node.parentId;
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      const n = nodes.get(parent);
      if (!n) break;
      ancestors.unshift(n.name || n.type);
      parent = n.parentId;
    }
    const name = node.name || node.type;
    items.push({ key: `${file}#${node.id}`, kind: 'layer', file, nodeId: node.id,
      label: name, context: [label, file, ...ancestors].join(' / '),
      searchText: `${name} ${node.textContent || ''} ${label} ${file}`.toLocaleLowerCase() });
  }
  return items;
}

export function filterDocumentSearch(items: DocumentSearchItem[], query: string): DocumentSearchItem[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return items.filter(item => words.every(word => item.searchText.includes(word)))
    .sort((a, b) => (a.kind === b.kind ? a.file.localeCompare(b.file) || a.label.localeCompare(b.label) : a.kind === 'page' ? -1 : 1));
}
