import { useEffect, useMemo, useState } from 'react';
import { ToolInput } from '@/editor/controls';
import {
  buildPatternFillStyles,
  defaultPatternMonsterFill,
  type PatternMonsterDefinition,
  type PatternMonsterFillConfig,
} from './pattern-fill-utils';

interface Props {
  activePatternId?: string;
  onSelect: (definition: PatternMonsterDefinition, config: PatternMonsterFillConfig) => void;
}

const PAGE_SIZE = 72;

type CatalogModule = typeof import('./patterns/pattern-monster-catalog');

export default function PatternLibraryPanel({ activePatternId, onSelect }: Props) {
  const [catalogModule, setCatalogModule] = useState<CatalogModule | null>(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    import('./patterns/pattern-monster-catalog').then(module => {
      if (!cancelled) setCatalogModule(module);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => setLimit(PAGE_SIZE), [query]);

  const filtered = useMemo(() => {
    if (!catalogModule) return [];
    const q = query.trim().toLowerCase();
    if (!q) return catalogModule.PATTERN_MONSTER_CATALOG;
    return catalogModule.PATTERN_MONSTER_CATALOG.filter(pattern =>
      pattern.title.toLowerCase().includes(q)
      || pattern.slug.includes(q)
      || pattern.tags.some(tag => tag.toLowerCase().includes(q)),
    );
  }, [catalogModule, query]);

  if (!catalogModule) {
    return <div className="py-8 text-center text-[11px] text-[var(--text-disabled)]">Loading pattern library…</div>;
  }

  const visible = filtered.slice(0, limit);
  const provenance = catalogModule.PATTERN_MONSTER_PROVENANCE;

  return (
    <div className="flex flex-col gap-2 pt-1">
      <ToolInput
        value={query}
        onChange={setQuery}
        text
        placeholder="Search 330 patterns"
        ariaLabel="Search pattern library"
      />

      <div className="flex items-center justify-between text-[10px] text-[var(--text-disabled)] px-0.5">
        <span>{filtered.length} patterns</span>
        <a
          href="https://github.com/catchspider2002/svelte-svg-patterns"
          target="_blank"
          rel="noreferrer"
          className="hover:text-[var(--text-secondary)] transition-colors"
          title="Pattern Monster source and MIT license"
        >
          {provenance.name} · {provenance.license}
        </a>
      </div>

      <div className="grid grid-cols-3 gap-1.5 max-h-[360px] overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        {visible.map(definition => {
          const config = defaultPatternMonsterFill(definition);
          const preview = buildPatternFillStyles(config, definition);
          const active = activePatternId === definition.slug;
          return (
            <button
              key={definition.slug}
              type="button"
              onClick={() => onSelect(definition, config)}
              className={`group min-w-0 overflow-hidden text-left cut-corners cut-border border transition-colors cursor-pointer ${
                active
                  ? 'border-[var(--accent)] [--cut-border-color:var(--accent)] bg-[var(--bg-hover)]'
                  : 'border-[var(--control-border)] [--cut-border-color:var(--control-border)] hover:border-[var(--control-border-hover)] hover:[--cut-border-color:var(--control-border-hover)]'
              }`}
              title={`${definition.title} · ${definition.tags.join(', ')}`}
              aria-pressed={active}
            >
              <span
                className="block h-14 w-full bg-[var(--canvas-bg)]"
                style={preview as React.CSSProperties}
                aria-hidden
              />
              <span className="block px-1.5 py-1 text-[10px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                {definition.title}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="py-8 text-center text-[11px] text-[var(--text-disabled)]">No matching patterns.</div>
      )}

      {limit < filtered.length && (
        <button
          type="button"
          onClick={() => setLimit(value => value + PAGE_SIZE)}
          className="h-[var(--control-height-sm)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--control-border)] cut-corners [--cut-border-color:var(--control-border)] hover:[--cut-border-color:var(--control-border-hover)] transition-colors cursor-pointer"
        >
          Show {Math.min(PAGE_SIZE, filtered.length - limit)} more
        </button>
      )}
    </div>
  );
}
