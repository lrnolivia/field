import { useMemo, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { projectFS, projectVersionAtom } from '@/code/project/project-fs';
import { activeFilePathAtom, switchActiveFile, getFriendlyFileName, componentBreadcrumbAtom, isComponentFilePath } from '@/code/project/active-file-store';
import { nodesAtom, selectedIdsAtom, updatingFromCanvasAtom } from '@/code/stores/store';
import { syncQueueCode, flushNow } from '@/code/mutation/mutation-queue';
import { viewportsConfigAtom, viewportWidthsAtom, interactingViewportIdAtom } from '@/code/stores/viewport-store';
import { containerOverridesAtom } from '@/code/stores/container-query-store';
import { useIsViewer } from '@/code/stores/viewer-mode-store';
import { sortChildrenByVisualOrder } from '../LayersPanel/rows';
import { commitLayerDrop } from '../LayersPanel/drag';
import { zoomToFitSelection } from '@/canvas/transform';
import { getContentRoot } from '@/canvas/node-ops';
import FileExplorer from '../FileExplorer';
import { PageDocumentIcon } from '@/shared/icons';
import { FigmaChevronDownIcon } from '@/shared/loew-figma-icons';

export function PortraitPages({ onChoose }: { onChoose: () => void }) {
  const [activeFile, setActiveFile] = useAtom(activeFilePathAtom);
  const setSelectedIds = useSetAtom(selectedIdsAtom);
  const setUpdatingFromCanvas = useSetAtom(updatingFromCanvasAtom);
  const setBreadcrumb = useSetAtom(componentBreadcrumbAtom);
  const version = useAtomValue(projectVersionAtom);
  const [query, setQuery] = useState('');
  const [manage, setManage] = useState(false);
  const pages = useMemo(() => {
    void version;
    return projectFS.listFiles('app/').filter(p => p.endsWith('page.client.tsx'))
      .map(path => ({ path, label: getFriendlyFileName(path) }))
      .sort((a, b) => a.label === 'Home' ? -1 : b.label === 'Home' ? 1 : a.label.localeCompare(b.label));
  }, [version]);
  return <div data-portrait-pages>
    <input type="search" aria-label="Search pages" placeholder="Find a page…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="field-page-cards">{pages.filter(p => `${p.path} ${p.label}`.toLowerCase().includes(query.toLowerCase())).map(p =>
      <button type="button" key={p.path} aria-current={p.path === activeFile ? 'page' : undefined} onClick={() => {
        if (p.path !== activeFile) { setBreadcrumb([]); switchActiveFile(activeFile, p.path, { setActiveFile, setSelectedIds, setUpdatingFromCanvas }, { syncQueueCode, flushNow }); }
        onChoose();
      }}><span className="field-page-card-mark" aria-hidden><PageDocumentIcon size={26} /></span><strong>{p.label}</strong><span>{p.path === activeFile ? 'Current page' : 'Open page'}</span></button>)}</div>
    {pages.length === 0 && <p>No editable pages in this project yet.</p>}
    <button type="button" className="field-portrait-row" aria-expanded={manage} onClick={() => setManage(!manage)}>Manage pages and routes <FigmaChevronDownIcon size={16} className="-rotate-90" /></button>
    {manage && <div className="field-portrait-page-manager"><FileExplorer /></div>}
  </div>;
}

export function PortraitLayers({ onEdit }: { onEdit: () => void }) {
  const nodes = useAtomValue(nodesAtom);
  const [selected, setSelected] = useAtom(selectedIdsAtom);
  const activeFilePath = useAtomValue(activeFilePathAtom);
  const vpConfigs = useAtomValue(viewportsConfigAtom);
  const vpWidths = useAtomValue(viewportWidthsAtom);
  const overrides = useAtomValue(containerOverridesAtom);
  const [vpId, setVpId] = useAtom(interactingViewportIdAtom);
  const viewer = useIsViewer();
  const [scope, setScope] = useState<string | null>(() => nodes.get(selected[0])?.parentId ?? null);
  const [multi, setMulti] = useState(false);
  const [query, setQuery] = useState('');
  const isCompMode = isComponentFilePath(activeFilePath);
  const parent = scope ? nodes.get(scope) : undefined;
  const ids = parent?.children ?? [...nodes.values()].filter(n => !n.parentId && n.type !== 'style').map(n => n.id);
  const ordered = sortChildrenByVisualOrder(parent, ids, vpId, nodes, vpConfigs, overrides, isCompMode);
  const rows = ordered.map(id => nodes.get(id)).filter(n => !!n && `${n.name || ''} ${n.type}`.toLowerCase().includes(query.toLowerCase()));
  const crumb: Array<{ id: string; label: string }> = [];
  const seen = new Set<string>();
  let cursor = parent;
  while (cursor && !seen.has(cursor.id)) { seen.add(cursor.id); crumb.unshift({ id: cursor.id, label: cursor.name || cursor.type }); cursor = cursor.parentId ? nodes.get(cursor.parentId) : undefined; }
  const move = (id: string, direction: -1 | 1) => {
    const index = ordered.indexOf(id); const target = ordered[index + direction];
    if (!target || viewer) return;
    commitLayerDrop({ nodes, vpConfigs, vpWidths, activeFilePath, isCompMode }, id,
      { nodeId: target, layerId: `${vpId}:${target}`, position: direction < 0 ? 'before' : 'after', depth: 0 });
  };
  return <div data-portrait-layers>
    <div className="field-portrait-split-row"><label>Canvas<select aria-label="Layer canvas" value={vpId} onChange={e => setVpId(e.target.value)}>
      {vpConfigs.map(v => <option key={v.id} value={v.id}>{v.id} · {v.width}</option>)}
    </select></label><button type="button" aria-pressed={multi} onClick={() => setMulti(!multi)}>Select many</button></div>
    <nav aria-label="Layer parents" className="field-layer-breadcrumbs"><button type="button" onClick={() => setScope(null)}>Document</button>
      {crumb.map(c => <button type="button" key={c.id} onClick={() => setScope(c.id)}>{c.label}</button>)}
    </nav>
    <input type="search" aria-label="Search layers in this group" placeholder="Find in this group…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="field-layer-cards">{rows.map(n => n && <div key={n.id} className="field-layer-card" data-selected={selected.includes(n.id)}>
      <button type="button" aria-pressed={selected.includes(n.id)} onClick={() => setSelected(multi ? selected.includes(n.id) ? selected.filter(id => id !== n.id) : [...selected, n.id] : [n.id])}>
        <svg aria-hidden width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill={selected.includes(n.id) ? 'var(--accent)' : 'none'} stroke="currentColor" /></svg><span><strong>{n.name || n.type}</strong><small>{n.type} · {n.children.length} children</small></span>
      </button>
      {!!n.children.length && <button type="button" aria-label={`Open children of ${n.name || n.type}`} onClick={() => setScope(n.id)}><FigmaChevronDownIcon size={16} className="-rotate-90" /></button>}
      {selected.includes(n.id) && !multi && <div className="field-layer-actions">
        <button type="button" disabled={viewer || n.fromLayout || !n.parentId || ordered.indexOf(n.id) === 0} onClick={() => move(n.id, -1)}>Move before</button>
        <button type="button" disabled={viewer || n.fromLayout || !n.parentId || ordered.indexOf(n.id) === ordered.length - 1} onClick={() => move(n.id, 1)}>Move after</button>
      </div>}
    </div>)}</div>
    {!rows.length && <p>No layers match in this group.</p>}
    {!!selected.length && <div className="field-portrait-split-row"><button type="button" onClick={() => { const root = getContentRoot(); if (root) zoomToFitSelection(root, selected); }}>Zoom to selection</button>
      <button type="button" onClick={onEdit}>Properties · {selected.length}</button></div>}
  </div>;
}
