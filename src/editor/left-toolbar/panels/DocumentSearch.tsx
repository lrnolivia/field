import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { getDefaultStore, useAtomValue, useSetAtom } from 'jotai';
import SearchBar from '@/design-system/SearchBar';
import { projectFS, projectVersionAtom } from '@/code/project/project-fs';
import { activeFilePathAtom, componentBreadcrumbAtom, getFriendlyFileName, switchActiveFile } from '@/code/project/active-file-store';
import { nodesAtom, selectedIdsAtom, updatingFromCanvasAtom } from '@/code/stores/store';
import { interactingViewportIdAtom, visibleViewportsAtom } from '@/code/stores/viewport-store';
import { flushNow, syncQueueCode } from '@/code/mutation/mutation-queue';
import { redirectToFitTextWrapper } from '@/canvas/node-ops';
import { filterDocumentSearch, indexPageSource, type DocumentSearchItem } from './document-search-index';

// Preserve browse context when another panel temporarily replaces this one;
// a new ProjectFS receives its own query and index.
const queries = new WeakMap<object, string>();
const indices = new WeakMap<object, { version: number; items: DocumentSearchItem[]; failures: number }>();

export default function DocumentSearch() {
  const version = useAtomValue(projectVersionAtom);
  const activeFile = useAtomValue(activeFilePathAtom);
  const nodes = useAtomValue(nodesAtom);
  const setActiveFile = useSetAtom(activeFilePathAtom);
  const setSelectedIds = useSetAtom(selectedIdsAtom);
  const setUpdatingFromCanvas = useSetAtom(updatingFromCanvasAtom);
  const setBreadcrumb = useSetAtom(componentBreadcrumbAtom);
  const setViewport = useSetAtom(interactingViewportIdAtom);
  const fs = projectFS;
  const [query, setQuery] = useState(() => queries.get(fs) ?? '');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DocumentSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failures, setFailures] = useState(0);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState<DocumentSearchItem | null>(null);
  const [bounds, setBounds] = useState({ left: 0, top: 0, width: 0, maxHeight: 300 });
  const inputRef = useRef<HTMLInputElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const resultsId = `${id}-results`;
  const scopeId = `${id}-scope`;
  const hasQuery = !!query.trim();
  const currentMasterCode = activeFile.endsWith('/page.client.tsx') ? null : fs.readFile(activeFile);
  const currentMasterItems = useMemo(() => {
    if (currentMasterCode == null) return [];
    try { return indexPageSource(activeFile, currentMasterCode, getFriendlyFileName(activeFile), false); }
    catch { return []; }
  }, [activeFile, currentMasterCode]);
  const results = useMemo(() => filterDocumentSearch([...items, ...currentMasterItems], query), [items, currentMasterItems, query]);
  const showResults = open && hasQuery;

  useEffect(() => { setQuery(queries.get(fs) ?? ''); setOpen(false); setPending(null); }, [fs]);
  useEffect(() => {
    if (!hasQuery) return;
    let cancelled = false;
    const cached = indices.get(fs);
    if (cached?.version === version) {
      setItems(cached.items); setFailures(cached.failures); setLoading(false);
      return;
    }
    setLoading(true); setItems([]); setFailures(0);
    // Snapshot before yielding so results never mix two source revisions.
    const sources = fs.listFiles('app/').filter(file => file.endsWith('/page.client.tsx'))
      .sort().map(file => ({ file, code: fs.readFile(file) ?? '' }));
    void (async () => {
      const next: DocumentSearchItem[] = [];
      let failed = 0;
      for (const { file, code } of sources) {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        if (cancelled) return;
        try { next.push(...indexPageSource(file, code, getFriendlyFileName(file))); }
        catch {
          failed++;
          next.push({ key: file, kind: 'page', file, label: getFriendlyFileName(file), context: file,
            searchText: `${getFriendlyFileName(file)} ${file}`.toLocaleLowerCase() });
        }
      }
      if (cancelled) return;
      indices.set(fs, { version, items: next, failures: failed });
      setItems(next); setFailures(failed); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fs, version, hasQuery]);

  useEffect(() => { setActive(0); }, [query, items]);
  useEffect(() => {
    if (!showResults) return;
    const position = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBounds({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: rect.bottom + 4, width: rect.width, maxHeight: Math.max(80, Math.min(420, window.innerHeight - rect.bottom - 16)) });
    };
    const dismiss = (event: PointerEvent) => {
      if (!hostRef.current?.contains(event.target as Node) && !resultsRef.current?.contains(event.target as Node)) setOpen(false);
    };
    position();
    const observer = new ResizeObserver(position);
    if (hostRef.current) observer.observe(hostRef.current);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    document.addEventListener('pointerdown', dismiss);
    return () => {
      observer.disconnect(); window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true); document.removeEventListener('pointerdown', dismiss);
    };
  }, [showResults]);
  useEffect(() => {
    if (showResults) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, showResults, id]);

  useEffect(() => {
    if (!pending) return;
    if (activeFile !== pending.file) { setPending(null); return; }
    const target = pending.nodeId!;
    if (!nodes.has(target)) return;
    const store = getDefaultStore();
    const currentViewport = store.get(interactingViewportIdAtom);
    const visible = store.get(visibleViewportsAtom);
    setViewport(visible.find(v => v.id === currentViewport)?.id ?? visible.find(v => v.isPrimary)?.id ?? visible[0]?.id ?? 'desktop');
    setSelectedIds([redirectToFitTextWrapper(target, nodes) ?? target]);
    setPending(null);
  }, [pending, activeFile, nodes, setSelectedIds, setViewport]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => { setError('This layer is no longer available. Search again to refresh the results.'); setPending(null); }, 5000);
    return () => clearTimeout(timer);
  }, [pending]);

  const changeQuery = (value: string) => { queries.set(fs, value); setQuery(value); setOpen(!!value.trim()); setError(''); setPending(null); };
  const choose = (item: DocumentSearchItem) => {
    setPending(null); setError('');
    if (!fs.exists(item.file)) { setError('This page is no longer available. Search again to refresh the results.'); return; }
    setBreadcrumb([]);
    switchActiveFile(activeFile, item.file, { setActiveFile, setSelectedIds, setUpdatingFromCanvas }, { syncQueueCode, flushNow });
    if (getDefaultStore().get(activeFilePathAtom) !== item.file) {
      setError('Finish the current interaction before opening this result.'); return;
    }
    if (item.kind === 'layer') setPending(item);
    setOpen(false);
    inputRef.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setPending(null); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && hasQuery) {
      // Home/End remain native text editing until the result list is open.
      if (!showResults && ['Home', 'End'].includes(event.key)) return;
      event.preventDefault(); setOpen(true);
      if (!showResults) { setActive(event.key === 'ArrowUp' ? Math.max(0, results.length - 1) : 0); return; }
      setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? Math.max(0, results.length - 1)
        : results.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0);
    }
    if (event.key === 'Enter' && showResults) {
      event.preventDefault();
      if (!loading && results[active]) choose(results[active]);
    }
    if (event.key === 'Tab') setOpen(false);
  };

  return <div ref={hostRef} data-document-search className="shrink-0 px-3 pb-2">
    <SearchBar value={query} onChange={changeQuery} placeholder="Search pages and layers…" inputRef={inputRef}
      onFocus={() => { if (hasQuery) setOpen(true); }} onClear={() => changeQuery('')} onKeyDown={onKeyDown}
      inputProps={{ role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': showResults,
        'aria-controls': showResults ? resultsId : undefined, 'aria-describedby': scopeId,
        'aria-activedescendant': showResults && !loading && results[active] ? `${id}-option-${active}` : undefined }} />
    <span id={scopeId} className="sr-only">All project pages and layers created on each page. Layers in the current template or component are included when that editor is open.</span>
    {error && <p role="status" className="mt-2 text-[11px] text-[var(--text-secondary)]">{error}</p>}
    {showResults && createPortal(<div ref={resultsRef} data-document-search-results data-field-chrome-panel
      className="fixed z-[10100] rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[var(--shadow-md)]"
      style={{ left: bounds.left, top: bounds.top, width: bounds.width, maxHeight: bounds.maxHeight, overflowY: 'auto' }}>
      <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)]" role="status" aria-live="polite">
        {loading ? 'Searching all pages…' : `All pages · ${results.length} results`}
        <div>{currentMasterItems.length ? 'Page layers + current editor' : 'Page layers · open a template or component to find its layers'}</div>
        {failures > 0 && <div>{failures} {failures === 1 ? 'page could' : 'pages could'} not be indexed.</div>}
      </div>
      <div id={resultsId} role="listbox" aria-label="Pages and layers" aria-busy={loading}>
        {!loading && ['page', 'layer'].map(kind => <div key={kind} role="group" aria-label={kind === 'page' ? 'Pages' : 'Layers'}>
          <div className="px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)]">{kind === 'page' ? 'Pages' : 'Layers'}</div>
          {results.map((item, index) => item.kind !== kind ? null : <button key={item.key} id={`${id}-option-${index}`}
            type="button" role="option" tabIndex={-1} aria-selected={index === active} data-document-result={item.kind}
            title={`${item.label} · ${item.file}`} onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}
            className={`block w-full min-w-0 px-3 py-2 text-left text-[11px] ${index === active ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'} text-[var(--text-primary)]`}>
            <span className="block break-words">{item.label}</span>
            <span className="block break-words text-[10px] text-[var(--text-secondary)]">{item.context}</span>
          </button>)}
          {!results.some(item => item.kind === kind) && <p className="px-3 pb-2 text-[11px] text-[var(--text-tertiary)]">No matching {kind === 'page' ? 'pages' : 'layers'}</p>}
        </div>)}
      </div>
    </div>, document.body)}
  </div>;
}
