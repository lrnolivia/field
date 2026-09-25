// OpacityControl.tsx — Self-contained opacity ToolAtom.
// Template for all simple slider-based atoms.

import { useLivePreview } from '../../../hooks/useLivePreview';
import { ToolSlider, ToolInput } from '../../../controls';
import { UnifiedControlProvider, ControlRow, useControlContext } from '../../../controls/unified';
import { LocalePillOr } from '@/editor/controls/LocaleBoundPill';
import type { AtomProps } from '../../../controls/unified/types';

function OpacityAtom({ compact = false }: { compact?: boolean }) {
  const { value, onChange, onChangeLive } = useControlContext();
  // `value` only updates on COMMIT (it's the parsed source value). During a
  // slider drag `onChangeLive` patches the canvas DOM but never writes code, so
  // without a local preview the number input + slider thumb would stay frozen
  // on the old value and snap on mouseup. `livePreview` mirrors the in-flight
  // value so BOTH the input and the slider track smoothly; an effect on `value`
  // clears it once the committed source catches up (no end-of-drag jump).
  const [livePreview, setLivePreview] = useLivePreview<string>([value]);

  const display = livePreview ?? value ?? '1';
  const num = parseFloat(display) || 0;

  if (compact) {
    return (
      <div data-appearance-opacity className="min-w-0 flex items-center rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] overflow-hidden">
        <span className="w-6 shrink-0 text-center text-[10px] text-[var(--text-secondary)]">◩</span>
        <ToolInput
          value={String(Math.round(num * 100))}
          onChange={(v) => {
            setLivePreview(null);
            const pct = Math.max(0, Math.min(100, parseFloat(v) || 0));
            onChange(String(pct / 100));
          }}
          step={1}
          className="border-0"
        />
        <span className="pr-1.5 text-[10px] text-[var(--text-secondary)]">%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <ToolSlider value={num} min={0} max={1} step={0.01}
        // Live tick → update the displayed value AND DOM-only patch the canvas.
        onChange={(v) => { setLivePreview(String(v)); onChangeLive(String(v)); }}
        // Mouseup → commit to code (keep the preview until `value` catches up).
        onCommit={(v) => { setLivePreview(String(v)); onChange(String(v)); }} />
      <ToolInput value={display} onChange={(v) => { setLivePreview(null); onChange(v); }} step={0.01} />
    </div>
  );
}

export function OpacityControl({ mode = 'direct', compact = false, ...modeProps }: AtomProps & { compact?: boolean }) {
  return (
    <UnifiedControlProvider property="opacity" defaultValue="1" mode={mode} {...modeProps}>
      {compact ? (
        <LocalePillOr property="opacity" label="Opacity"><OpacityAtom compact /></LocalePillOr>
      ) : (
        <ControlRow label="Opacity">
          <LocalePillOr property="opacity" label="Opacity"><OpacityAtom /></LocalePillOr>
        </ControlRow>
      )}
    </UnifiedControlProvider>
  );
}
