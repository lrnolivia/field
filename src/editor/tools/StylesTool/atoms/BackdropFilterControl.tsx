// BackdropFilterControl.tsx — backdrop-filter blur ToolAtom.
// Compact Effects rows open the canonical Inspector Options Panel instead of
// exposing a one-off numeric field in the list.

import { useRef, useState } from 'react';
import { ControlActionRow, EffectRow } from '../../../controls';
import { UnifiedControlProvider, ControlRow, useControlContext } from '../../../controls/unified';
import type { AtomProps } from '../../../controls/unified/types';
import { FilterIcon } from '@/design-system/PropertyIcons';
import { useEditorPanel } from '../../../hooks/useEditorPanel';
import { EffectOptionsPanel, EffectOptionSection, EffectOptionAction, InspectorSectionGlyph, ScalarRow } from '../../../ui/OptionsPanel';
import { parseBackdropBlur, formatBackdropBlur } from '../style-helpers';
import { trace } from '@/shared/debug-trace';

function BackdropBlurEditor({
  value,
  onChangeLive,
  onCommit,
  onReset,
}: {
  value: number;
  onChangeLive: (value: number) => void;
  onCommit: (value: number) => void;
  onReset: () => void;
}) {
  return (
    <EffectOptionsPanel>
      <EffectOptionSection
        title="Background blur"
        glyph={<InspectorSectionGlyph kind="blur" />}
        action={<EffectOptionAction onClick={onReset}>Reset</EffectOptionAction>}
      >
        <ScalarRow
          label="Radius"
          value={value}
          min={0}
          max={80}
          step={0.5}
          unit="px"
          onChange={onCommit}
          onChangeLive={onChangeLive}
          onCommit={onCommit}
        />
      </EffectOptionSection>
    </EffectOptionsPanel>
  );
}

function BackdropFilterAtom({ compactSection = false }: { compactSection?: boolean }) {
  const { value, onChangeMultiple, onChangeLive } = useControlContext();
  const committedNum = parseBackdropBlur(value);
  const [dragNum, setDragNum] = useState<number | null>(null);
  const displayNum = dragNum ?? committedNum;
  const rowRef = useRef<HTMLDivElement>(null);

  const commit = (n: number) => {
    const next = Math.max(0, Number.isFinite(n) ? n : 0);
    const v = formatBackdropBlur(next);
    trace.action('backdrop-filter:set', { blur: next, value: v });
    onChangeMultiple({ backdropFilter: v, WebkitBackdropFilter: v });
    setDragNum(null);
  };

  const reset = () => {
    trace.action('backdrop-filter:reset');
    onChangeMultiple({ backdropFilter: '', WebkitBackdropFilter: '' });
    setDragNum(null);
  };

  const { openPanel, panelPopup } = useEditorPanel(
    'Background blur',
    () => (
      <BackdropBlurEditor
        value={displayNum}
        onChangeLive={(n) => {
          setDragNum(n);
          onChangeLive(formatBackdropBlur(n));
        }}
        onCommit={commit}
        onReset={reset}
      />
    ),
    { kind: 'options', width: 300 },
  );

  if (compactSection) {
    return (
      <>
        <div ref={rowRef} className="w-full min-w-0">
          <EffectRow
            control={
              <ControlActionRow onClick={() => openPanel()} embedded>
                <FilterIcon width={16} height={16} bg="var(--control-border)" className="shrink-0 opacity-70" />
                <span className="min-w-0 flex-1 truncate text-left text-xs text-[var(--text-primary)]">Background blur</span>
                <span className="shrink-0 pr-1 text-[10px] tabular-nums text-[var(--text-secondary)]">{displayNum}px</span>
              </ControlActionRow>
            }
            onRemove={reset}
          />
        </div>
        {panelPopup(rowRef)}
      </>
    );
  }

  return (
    <ControlRow label="Backdrop">
      <ScalarRow
        label="Blur"
        hideLabel
        value={displayNum}
        min={0}
        max={80}
        step={0.5}
        unit="px"
        onChange={commit}
        onChangeLive={(n) => {
          setDragNum(n);
          onChangeLive(formatBackdropBlur(n));
        }}
        onCommit={commit}
      />
    </ControlRow>
  );
}

export function BackdropFilterControl({ mode = 'direct', compactSection = false, ...modeProps }: AtomProps & { compactSection?: boolean }) {
  return (
    <UnifiedControlProvider property="backdropFilter" defaultValue="" mode={mode} {...modeProps}>
      <BackdropFilterAtom compactSection={compactSection} />
    </UnifiedControlProvider>
  );
}
