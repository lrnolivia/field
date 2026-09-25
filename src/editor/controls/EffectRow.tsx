// EffectRow — canonical FigUI3 applied-effect row grammar.
// The value/editor trigger is followed by the visibility and remove action
// slots used by Figma UI3. Visibility is intentionally reserved until field
// has a persistent per-effect enabled bit that preserves the authored effect.

import type { ReactNode } from 'react';
import { RemoveButton } from './RemoveButton';

export interface EffectRowProps {
  control: ReactNode;
  onRemove?: () => void;
}

export function EffectRow({ control, onRemove }: EffectRowProps) {
  return (
    <div data-inspector-effect-row className="grid grid-cols-[minmax(0,1fr)_28px_28px] gap-0.5 items-center w-full min-w-0">
      <div
        data-inspector-effect-value
        className="h-[var(--control-height)] min-w-0 overflow-hidden bg-[var(--grid-line)] border border-[var(--control-border)] cut-corners cut-border [--cut-border-color:var(--control-border)] hover:border-[var(--control-border-hover)] hover:[--cut-border-color:var(--control-border-hover)]"
      >
        {control}
      </div>
      <span data-effect-visibility-slot className="w-7 h-[var(--control-height)]" aria-hidden />
      <div className="h-[var(--control-height)] flex items-center justify-center">
        {onRemove ? <RemoveButton onClick={() => onRemove()} /> : <span className="w-4" aria-hidden />}
      </div>
    </div>
  );
}

export default EffectRow;
