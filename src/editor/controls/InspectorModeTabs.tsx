import { useAtom } from 'jotai';
import { inspectorModeAtom } from '@/code/stores/editor-store';
import InspectorZoomControl from './InspectorZoomControl';

export default function InspectorModeTabs() {
  const [mode, setMode] = useAtom(inspectorModeAtom);

  return (
    <div
      data-inspector-mode-tabs
      className="shrink-0 h-10 px-3 border-b border-[var(--border-light)] flex items-center gap-1"
      role="tablist"
      aria-label="Inspector mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'design'}
        onClick={() => setMode('design')}
        className={mode === 'design'
          ? 'h-7 px-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-active)] rounded-[5px]'
          : 'h-7 px-2 text-xs font-medium text-[var(--text-secondary)] rounded-[5px] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
      >
        Design
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'prototype'}
        onClick={() => setMode('prototype')}
        className={mode === 'prototype'
          ? 'h-7 px-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-active)] rounded-[5px]'
          : 'h-7 px-2 text-xs font-medium text-[var(--text-secondary)] rounded-[5px] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
      >
        Prototype
      </button>
      <InspectorZoomControl />
    </div>
  );
}
