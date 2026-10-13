import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { projectFS, projectVersionAtom } from '@/code/project/project-fs';
import { activeFilePathAtom, getFileDisplayName } from '@/code/project/active-file-store';
import { buildInstanceClipboardNode, insertNodes } from '@/canvas/insertion-bridge';
import { wouldCreateComponentCycle } from '@/code/components/component-cycle';
import { getCodeComponentInsertSize } from '@/code/components/component-registry';
import { hasComponentControls } from '@/code/components/controls-parser';
import { useIsViewer } from '@/code/stores/viewer-mode-store';
import { FigmaLibraryIcon, FigmaPathIcon } from '@/shared/loew-figma-icons';
import { FieldGlyph } from '../glyph';
import LibraryPanel from '../left-toolbar/panels/LibraryPanel';

export default function PortraitLibrary({ onPlace }: { onPlace: () => void }) {
  const version = useAtomValue(projectVersionAtom);
  const activeFile = useAtomValue(activeFilePathAtom);
  const viewer = useIsViewer();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'components' | 'vectors'>('all');
  const [selected, setSelected] = useState<{ path: string; file: string } | null>(null);
  const [manage, setManage] = useState(false);
  const [error, setError] = useState('');
  const files = useMemo(() => {
    void version;
    return ['components/', 'icons/', 'vectors/'].flatMap(prefix => projectFS.listFiles(prefix))
      .filter(path => path.endsWith('.tsx')).sort((a, b) => getFileDisplayName(a).localeCompare(getFileDisplayName(b)));
  }, [version]);
  const filtered = files.filter(path => (kind === 'all' || (kind === 'components') === path.startsWith('components/'))
    && `${path} ${getFileDisplayName(path)}`.toLowerCase().includes(query.toLowerCase()));
  const place = () => {
    if (!selected || viewer) return;
    if (selected.file !== activeFile) { setError('The page changed. Choose the item again before placing it.'); return; }
    const code = projectFS.readFile(selected.path);
    if (!code) { setError('This library item is no longer available. Choose another item.'); return; }
    if (wouldCreateComponentCycle(selected.path, activeFile)) { setError('This would place a component inside itself. Choose a different item.'); return; }
    const name = selected.path.replace(/^(components|icons|vectors)\//, '').replace(/\.tsx$/, '');
    const payload = buildInstanceClipboardNode(selected.path, name);
    if (hasComponentControls(code)) Object.assign(payload[0].styles, getCodeComponentInsertSize(code));
    const created = insertNodes(payload, { ignoreSelection: true });
    if (created.length) onPlace();
    else setError('The item could not be placed. Your project has not changed.');
  };
  return <div data-portrait-library>
    <nav className="field-portrait-task-nav" aria-label="Library kinds">{(['all', 'components', 'vectors'] as const).map(value => <button type="button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); setSelected(null); }}>{value}</button>)}</nav>
    <input type="search" aria-label="Search library" placeholder="Find a component or vector…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="field-page-cards">{filtered.map(path => <button type="button" key={path} aria-pressed={selected?.path === path} onClick={() => { setSelected({ path, file: activeFile }); setError(''); }}>
      <FieldGlyph behavior="generic">{path.startsWith('components/') ? <FigmaLibraryIcon size={26} /> : <FigmaPathIcon size={26} />}</FieldGlyph>
      <strong>{getFileDisplayName(path)}</strong><span>{path.startsWith('components/') ? 'Component' : 'Vector'}</span>
    </button>)}</div>
    {!filtered.length && <p>{files.length ? 'No library items match this search.' : 'No components or vectors yet. Open library management to create or link one.'}</p>}
    {selected && <div className="field-library-placement"><strong>{getFileDisplayName(selected.path)}</strong><p>Place an instance on the visible canvas. The original stays in your library.</p>
      <div className="field-portrait-split-row"><button type="button" onClick={() => setSelected(null)}>Cancel</button><button type="button" disabled={viewer} onClick={place}>Place on canvas</button></div>
    </div>}
    {error && <p role="alert">{error}</p>}
    <button type="button" className="field-portrait-row" aria-expanded={manage} onClick={() => setManage(!manage)}>Templates and library management</button>
    {manage && <LibraryPanel mode="library" />}
  </div>;
}
