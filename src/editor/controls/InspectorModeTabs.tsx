import { useAtom } from 'jotai';
import { inspectorModeAtom } from '@/code/stores/editor-store';
import InspectorZoomControl from './InspectorZoomControl';

export default function InspectorModeTabs() {
  const [mode, setMode] = useAtom(inspectorModeAtom);

  return (
    <div
      data-inspector-mode-tabs
      className="shrink-0 h-8 px-3 border-b border-[var(--border-light)] flex items-center gap-1"
      role="tablist"
      aria-label="Inspector mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'design'}
        onClick={() => setMode('design')}
        className={mode === 'design'
          ? 'px-2 py-1 text-xs font-semibold text-[var(--text-primary)] bg-[var(--choice-bg)] cut-corners'
          : 'px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}
      >
        Design
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'prototype'}
        onClick={() => setMode('prototype')}
        className={mode === 'prototype'
          ? 'px-2 py-1 text-xs font-semibold text-[var(--text-primary)] bg-[var(--choice-bg)] cut-corners'
          : 'px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}
      >
        Prototype
      </button>
      <InspectorZoomControl />
    </div>
  );
}
