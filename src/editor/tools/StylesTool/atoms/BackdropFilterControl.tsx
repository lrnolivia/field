// BackdropFilterControl.tsx — Self-contained backdrop-filter (blur) ToolAtom.
//
// Mirrors OpacityControl: a single slider + number input. The underlying CSS
// value is a function string (`blur(NNpx)`), so we parse the px radius out for
// the slider and re-emit `blur(NNpx)` on change. Unlike Opacity (one property),
// we write BOTH `backdropFilter` and the Safari-prefixed `WebkitBackdropFilter`
// together via `onChangeMultiple`, so editing the blur never leaves the two
// prefixes pointing at different radii.

import { useState } from 'react';
import { ToolSlider, ToolInput, RemoveButton } from '../../../controls';
import { UnifiedControlProvider, ControlRow, useControlContext } from '../../../controls/unified';
import type { AtomProps } from '../../../controls/unified/types';
import { parseBackdropBlur, formatBackdropBlur } from '../style-helpers';
import { trace } from '@/shared/debug-trace';

function BackdropFilterAtom({ compactSection = false }: { compactSection?: boolean }) {
  const { value, onChangeMultiple, onChangeLive } = useControlContext();
  const committedNum = parseBackdropBlur(value);
  // Live drag value: while the slider is being dragged the committed code value
  // isn't written per-tick (only on mouseup), so we mirror the slider's value
  // here to keep the number input on the right moving with the thumb. Cleared
  // on commit, when the committed code value takes over again.
  const [dragNum, setDragNum] = useState<number | null>(null);
  const displayNum = dragNum ?? committedNum;

  // Commit writes both the standard + prefixed properties so a later edit
  // never leaves WebkitBackdropFilter stuck at a stale blur radius.
  const commit = (n: number) => {
    const v = formatBackdropBlur(n);
    trace.action('backdrop-filter:set', { blur: n, value: v });
    onChangeMultiple({ backdropFilter: v, WebkitBackdropFilter: v });
  };

  if (compactSection) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_56px_auto] gap-1 items-center w-full">
        <div className="h-[var(--control-height)] px-2 flex items-center rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] text-xs text-[var(--text-primary)]">
          Background blur
        </div>
        <ToolInput value={String(displayNum)} onChange={(v) => commit(parseFloat(v) || 0)} step={0.5} />
        <RemoveButton onClick={() => onChangeMultiple({ backdropFilter: '', WebkitBackdropFilter: '' })} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <ToolSlider value={displayNum} min={0} max={30} step={0.5}
        // Live tick → DOM-only canvas preview + move the number on the right
        // (no code write per frame).
        onChange={(v) => { setDragNum(v); onChangeLive(formatBackdropBlur(v)); }}
        // Mouseup → commit both prefixes to code, then release the live value.
        onCommit={(v) => { commit(v); setDragNum(null); }} />
      <ToolInput value={String(displayNum)} onChange={(v) => commit(parseFloat(v) || 0)} step={0.5} />
    </div>
  );
}

export function BackdropFilterControl({ mode = 'direct', compactSection = false, ...modeProps }: AtomProps & { compactSection?: boolean }) {
  return (
    <UnifiedControlProvider property="backdropFilter" defaultValue="" mode={mode} {...modeProps}>
      {compactSection ? (
        <BackdropFilterAtom compactSection />
      ) : (
        <ControlRow label="Backdrop">
          <BackdropFilterAtom />
        </ControlRow>
      )}
    </UnifiedControlProvider>
  );
}
