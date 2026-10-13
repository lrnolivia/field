// GradientControl.tsx — granular gradient ToolAtom using the universal PaintPicker shell.

import { useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { UnifiedControlProvider, useControlContext, ControlRow } from '../../../controls/unified';
import { ControlActionRow, ColorSwatch } from '../../../controls';
import GradientEditor from '../../../ui/GradientEditor';
import AssetPresetGrid from '../../../ui/AssetPresetGrid';
import ToolPopup, { useToolPopupOptional } from '../../../ui/ToolPopup';
import PaintPickerShell, { type PaintPickerSurface, type PaintType } from '../../../ui/PaintPickerShell';
import { createDefaultGradient, formatGradient } from '@/shared/gradient-utils';
import { presetTokensAtom } from '@/code/stores/preset-store';
import { parseVarRef } from '@/shared/css-utils';
import { resolveCssTokens } from '@/code/project/preset-ops';
import type { AtomProps } from '../../../controls/unified/types';
import { trace } from '@/shared/debug-trace';

const GRADIENT_ONLY = new Set<PaintType>(['gradient']);

function GradientAtom() {
  const { value, onChange } = useControlContext();
  const parentPopup = useToolPopupOptional();
  const rowRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState<PaintPickerSurface>('custom');
  const tokens = useAtomValue(presetTokensAtom);
  const gradientPresets = tokens.filter(token => token.category === 'gradient');

  const css = value || '';
  const presetName = css.startsWith('var(--') ? parseVarRef(css) || '' : '';
  const editorValue = presetName
    ? resolveCssTokens(css, gradientPresets)
    : (css || formatGradient(createDefaultGradient()));
  const isGradient = /gradient\s*\(/.test(editorValue);

  const preview = useMemo(() => ({ background: editorValue }), [editorValue]);

  return (
    <>
      <div ref={rowRef} className="w-full min-w-0">
        <ControlActionRow onClick={() => { trace.action('gradient-control:open-universal-picker', { hasValue: isGradient }); setOpen(true); }}>
          {isGradient ? <ColorSwatch style={preview} /> : <ColorSwatch className="bg-[var(--bg-hover)]" />}
          <span className="text-xs text-[var(--text-primary)] truncate flex-1 text-left">{isGradient ? 'Gradient' : 'Add gradient'}</span>
        </ControlActionRow>
      </div>

      <ToolPopup
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Gradient"
        ariaLabel="Paint picker"
        anchorRef={rowRef}
        width={360}
        hideHeader
        showNestedHeaderWhenHidden
        radius={14}
        nested={!!parentPopup}
        outsidePointerMode="close"
      >
        <PaintPickerShell
          surface={surface}
          onSurfaceChange={setSurface}
          activeType="gradient"
          onTypeChange={() => {}}
          supportedTypes={GRADIENT_ONLY}
          contextLabel="this gradient property"
          onPlus={() => setSurface('libraries')}
          onClose={() => setOpen(false)}
        >
          {surface === 'custom' ? (
            <GradientEditor value={editorValue} onChange={onChange} hideOverlay canonical />
          ) : (
            <AssetPresetGrid
              presets={gradientPresets}
              type="gradient"
              activePresetName={presetName || undefined}
              onApplyPreset={onChange}
            />
          )}
        </PaintPickerShell>
      </ToolPopup>
    </>
  );
}

export function GradientControl({ mode = 'direct', ...mp }: AtomProps) {
  return (
    <UnifiedControlProvider property="background" defaultValue="" mode={mode} {...mp}>
      <ControlRow label="Gradient"><GradientAtom /></ControlRow>
    </UnifiedControlProvider>
  );
}
