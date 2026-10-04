// PaintRow — canonical FigUI3 paint row grammar.
// The value + paint-local opacity are one compound field, followed by the
// visibility and remove affordance slots used by Figma UI3.
// Only source-backed actions receive a column; absent actions reserve no space.

import type { ReactNode } from 'react';
import ToolInput from './ToolInput';
import { RemoveButton } from './RemoveButton';

export interface PaintRowProps {
  control: ReactNode;
  opacity: number;
  onOpacityChange?: (value: number) => void;
  onOpacityChangeLive?: (value: number) => void;
  onRemove?: () => void;
  opacityDisabled?: boolean;
  opacityLabel?: string;
}

function clampPercent(raw: string | number): number {
  const n = typeof raw === 'number' ? raw : Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

export function PaintRow({
  control,
  opacity,
  onOpacityChange,
  onOpacityChangeLive,
  onRemove,
  opacityDisabled = false,
  opacityLabel = 'Paint opacity',
}: PaintRowProps) {
  const pct = clampPercent(opacity);
  const disabled = opacityDisabled || !onOpacityChange;

  return (
    <div data-inspector-paint-row className="grid gap-0.5 items-center w-full min-w-0" style={{ gridTemplateColumns: onRemove ? 'minmax(0, 1fr) 28px' : 'minmax(0, 1fr)' }}>
      <div
        data-inspector-paint-compound
        className="grid grid-cols-[minmax(0,1fr)_54px] items-center h-[var(--control-height)] min-w-0 overflow-hidden bg-[var(--grid-line)] border border-[var(--control-border)] cut-corners cut-border [--cut-border-color:var(--control-border)] hover:border-[var(--control-border-hover)] hover:[--cut-border-color:var(--control-border-hover)]"
      >
        <div data-inspector-paint-value className="min-w-0 h-full overflow-hidden">{control}</div>
        <div className="h-full min-w-0 border-l border-[var(--control-border)] overflow-hidden">
          <ToolInput
            value={String(pct)}
            onChange={(v) => onOpacityChange?.(clampPercent(v))}
            onChangeLive={onOpacityChangeLive ? (v) => onOpacityChangeLive(clampPercent(v)) : undefined}
            onCommit={onOpacityChangeLive ? (v) => onOpacityChange?.(clampPercent(v)) : undefined}
            min={0}
            max={100}
            chevronLabel="%"
            ariaLabel={opacityLabel}
            disabled={disabled}
            className="min-w-0 !h-full !border-0 !bg-transparent !rounded-none ![clip-path:none]"
          />
        </div>
      </div>

      {onRemove && <div className="h-[var(--control-height)] flex items-center justify-center">
        <RemoveButton onClick={onRemove} />
      </div>}

    </div>
  );
}

export default PaintRow;
