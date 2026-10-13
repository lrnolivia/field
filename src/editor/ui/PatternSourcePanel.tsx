import PatternLibraryPanel from './PatternLibraryPanel';
import type { PatternMonsterDefinition, PatternMonsterFillConfig } from './pattern-fill-utils';

interface Props {
  activePatternId?: string;
  onSelect: (definition: PatternMonsterDefinition, config: PatternMonsterFillConfig) => void;
  onChooseImage: () => void;
}

/** Reuses the canonical collection; importing an image is a secondary route. */
export default function PatternSourcePanel({ activePatternId, onSelect, onChooseImage }: Props) {
  return (
    <div data-pattern-source-catalog className="min-h-0 flex flex-col gap-3">
      <PatternLibraryPanel activePatternId={activePatternId} onSelect={onSelect} />
      <button
        type="button"
        onClick={onChooseImage}
        className="h-[var(--control-height-sm)] shrink-0 px-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--control-border)] cut-corners [--cut-border-color:var(--control-border)] hover:[--cut-border-color:var(--control-border-hover)] transition-colors cursor-pointer"
      >
        Use an image…
      </button>
    </div>
  );
}
