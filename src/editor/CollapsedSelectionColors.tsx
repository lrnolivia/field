import { useAtomValue } from 'jotai';
import { selectedIdsAtom, getNodeFromCache } from '@/code/stores/store';
import { useNodesComputed } from '@/code/stores/node-family';
import { aggregateSelectionColors } from '@/editor/selection-colors';

/** Compact readout of the same selected-scope colors shown in the full Inspector. */
export default function CollapsedSelectionColors({ onOpen }: { onOpen: () => void }) {
  const selectedIds = useAtomValue(selectedIdsAtom);
  const groups = useNodesComputed((nodes) => aggregateSelectionColors(
    selectedIds, nodes, (id) => getNodeFromCache(id) ?? nodes.get(id),
  ), [selectedIds]);

  if (groups.length <= 1) return null;
  const openColors = () => {
    onOpen();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelector('[data-selection-colors-figui3]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));
  };

  return <button type="button" data-collapsed-selection-colors aria-label={`Selection colors, ${groups.length} colors. Open Inspector`}
    title="selection colors" onClick={openColors}
    className="flex w-[calc(100%-8px)] flex-col items-center gap-1 rounded-[5px] py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
    <span className="text-[9px]">colors</span>
    {groups.slice(0, 3).map((group) => <span key={group.value} className="h-5 w-5 rounded-[4px] border border-[var(--border-light)]"
      style={{ background: group.value }} aria-hidden />)}
    {groups.length > 3 && <span className="text-[10px] tabular-nums">+{groups.length - 3}</span>}
  </button>;
}
