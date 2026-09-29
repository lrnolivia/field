import { useState } from 'react';
import { ControlLabel, ToolInput } from '../controls';
import { flushNow } from '@/code/mutation/mutation-queue';
import {
  paddingAllEqual,
  paddingAxisCompatible,
  readPaddingSides,
  setPaddingAll,
  setPaddingAxis,
  setPaddingSide,
} from './layout-padding';

type PaddingView = 'auto' | 'equal' | 'axes' | 'sides';

interface Props {
  styles: Record<string, string>;
  onUpdateMultiple: (styles: Record<string, string>) => void;
}

function EqualSidesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.25 5.25 4.8 6.7a1.85 1.85 0 0 0 0 2.6 1.85 1.85 0 0 0 2.6 0l1.1-1.1" />
      <path d="m9.75 10.75 1.45-1.45a1.85 1.85 0 0 0 0-2.6 1.85 1.85 0 0 0-2.6 0L7.5 7.8" />
    </svg>
  );
}

function AxisSidesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
      <path d="M3 6h10M3 10h10M6 3v10M10 3v10" opacity="0.55" />
      <path d="M5 8h6M8 5v6" />
    </svg>
  );
}

function IndividualSidesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
      <path d="M5 1.5v3M11 1.5v3M14.5 5h-3M14.5 11h-3M11 14.5v-3M5 14.5v-3M1.5 11h3M1.5 5h3" />
    </svg>
  );
}

export default function LayoutPaddingControl({ styles, onUpdateMultiple }: Props) {
  const sides = readPaddingSides(styles);
  const allEqual = paddingAllEqual(sides);
  const axisCompatible = paddingAxisCompatible(sides);
  const [view, setView] = useState<PaddingView>('auto');
  const horizontalEqual = sides[1].trim() === sides[3].trim();
  const verticalEqual = sides[0].trim() === sides[2].trim();

  const resolvedView = view === 'equal'
    ? 'equal'
    : view === 'axes'
      ? 'axes'
      : view === 'sides'
        ? 'sides'
        : allEqual
          ? 'equal'
          : axisCompatible
            ? 'axes'
            : 'sides';

  const display = (value: string) => String(Number.parseFloat(value) || 0);
  const apply = (next: Record<string, string>) => {
    onUpdateMultiple(next);
    flushNow();
  };

  return (
    <div data-layout-padding data-layout-padding-view={resolvedView} className="flex flex-col gap-2 w-full">
      <div data-layout-padding-toolbar className="grid grid-cols-[var(--tool-label-col)_minmax(0,1fr)] items-center w-full">
        <ControlLabel label="Padding" property="padding" plain cell />
        <div className="flex min-w-0 justify-end">
          <div className="flex shrink-0 overflow-hidden rounded-[var(--control-radius)] border border-[var(--control-border)]">
            <button
              type="button"
              data-layout-padding-equal
              aria-pressed={resolvedView === 'equal'}
              onClick={() => setView('equal')}
              className={`h-[var(--control-height)] w-6 flex items-center justify-center ${resolvedView === 'equal' ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              title={allEqual ? 'Equal padding' : 'Edit all padding sides together'}
              aria-label="Equal padding"
            >
              <EqualSidesIcon />
            </button>
            <button
              type="button"
              data-layout-padding-axis-mode
              aria-pressed={resolvedView === 'axes'}
              onClick={() => setView('axes')}
              className={`h-[var(--control-height)] w-6 flex items-center justify-center border-l border-[var(--control-border)] ${resolvedView === 'axes' ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              title="Horizontal and vertical padding"
              aria-label="Horizontal and vertical padding"
            >
              <AxisSidesIcon />
            </button>
            <button
              type="button"
              data-layout-padding-individual
              aria-pressed={resolvedView === 'sides'}
              onClick={() => setView('sides')}
              className={`h-[var(--control-height)] w-6 flex items-center justify-center border-l border-[var(--control-border)] ${resolvedView === 'sides' ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              title="Individual padding sides"
              aria-label="Individual padding sides"
            >
              <IndividualSidesIcon />
            </button>
          </div>
        </div>
      </div>

      <div data-layout-padding-editor className="grid grid-cols-[var(--tool-label-col)_minmax(0,1fr)] items-center w-full">
        <span aria-hidden />
        <div className="min-w-0">
          {resolvedView === 'equal' ? (
            <ToolInput
              value={allEqual ? display(sides[0]) : ''}
              placeholder={allEqual ? undefined : 'Mixed'}
              onChange={(value) => apply(setPaddingAll(value))}
              min={0}
              ariaLabel="Equal padding"
            />
          ) : resolvedView === 'axes' ? (
            <div data-layout-padding-axes className="grid grid-cols-2 gap-2">
              <ToolInput value={horizontalEqual ? display(sides[1]) : ''} placeholder={horizontalEqual ? undefined : 'Mixed'} onChange={(v) => apply(setPaddingAxis(sides, 'horizontal', v))} min={0} chevronLabel="H" ariaLabel="Horizontal padding" />
              <ToolInput value={verticalEqual ? display(sides[0]) : ''} placeholder={verticalEqual ? undefined : 'Mixed'} onChange={(v) => apply(setPaddingAxis(sides, 'vertical', v))} min={0} chevronLabel="V" ariaLabel="Vertical padding" />
            </div>
          ) : (
            <div data-layout-padding-sides className="grid grid-cols-4 gap-2">
              {(['T', 'R', 'B', 'L'] as const).map((label, index) => (
                <ToolInput key={label} value={display(sides[index])} onChange={(v) => apply(setPaddingSide(sides, index, v))} min={0} chevronLabel={label} ariaLabel={`Padding ${label}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
