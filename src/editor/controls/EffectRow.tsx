// EffectRow — canonical FigUI3 applied-effect row grammar.
// Only source-backed actions receive a column; absent actions reserve no space.

import type { ReactNode } from 'react';
import { RemoveButton } from './RemoveButton';

export interface EffectRowProps {
  control: ReactNode;
  onRemove?: () => void;
}

export function EffectRow({ control, onRemove }: EffectRowProps) {
  return (
    <div data-inspector-effect-row className="grid gap-0.5 items-center w-full min-w-0" style={{ gridTemplateColumns: onRemove ? 'minmax(0, 1fr) 28px' : 'minmax(0, 1fr)' }}>
      <div
        data-inspector-effect-value
        className="h-[var(--control-height)] min-w-0 overflow-hidden bg-[var(--grid-line)] border border-[var(--control-border)] cut-corners cut-border [--cut-border-color:var(--control-border)] hover:border-[var(--control-border-hover)] hover:[--cut-border-color:var(--control-border-hover)]"
      >
        {control}
      </div>
      {onRemove && <div className="h-[var(--control-height)] flex items-center justify-center">
        <RemoveButton onClick={onRemove} />
      </div>}
    </div>
  );
}

export default EffectRow;
