// StrokeControl.tsx — text stroke popup control.
// Text stroke is intentionally a reduced source-backed subset of the shared
// Stroke grammar: width + paint. Box/vector-only semantics are not faked.

import { useRef, useState, useCallback } from 'react';
import { ControlLabel, ControlActionRow, ColorSwatch, PaintRow } from '../../../controls';
import { TextStrokeIcon } from '@/design-system/PropertyIcons';
import { useTextStyles } from '../../../hooks/useTextStyles';
import { useControl } from '../../../controls/ControlProvider';
import ToolPopup from '../../../ui/ToolPopup';
import { OptionsPanel, OptionSection, ScalarRow, PaintOptionRow } from '../../../ui/OptionsPanel';
import { trace } from '@/shared/debug-trace';
import { toHexDisplay } from '../../../ui/color-utils';
import { canAdjustLiteralPaintOpacity, serializeLiteralPaintOpacity, splitPaintOpacity } from '../../../ui/paint-opacity';

export function StrokeControl({ compactSection = false }: { compactSection?: boolean } = {}) {
  const text = useTextStyles();
  const rowRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { styles, updateStyle, updateStyleLive } = useControl();

  const strokeVal = text.isEditing ? text.get('webkitTextStroke').value : (styles.WebkitTextStroke || styles.webkitTextStroke || '');
  const strokeParts = strokeVal.match(/(-?\d+\.?\d*)px\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
  const strokeWidth = strokeParts ? parseFloat(strokeParts[1]) : 0;
  const strokeColor = strokeParts ? strokeParts[2] : '#000000';

  const setStroke = useCallback((w: number, c: string) => {
    const val = w === 0 ? '' : `${w}px ${c}`;
    if (text.isEditing) text.set('webkitTextStroke', val);
    else updateStyle('WebkitTextStroke', val);
  }, [text, updateStyle]);

  const setStrokeLive = useCallback((w: number, c: string) => {
    const val = w === 0 ? '' : `${w}px ${c}`;
    if (text.isEditing) text.setLive('webkitTextStroke', val);
    else updateStyleLive('WebkitTextStroke', val);
  }, [text, updateStyleLive]);

  trace.fn('StrokeControl:render', { strokeVal, strokeWidth, strokeColor, isEditing: text.isEditing, isOpen });

  const strokePaint = splitPaintOpacity(strokeColor);
  const canEditOpacity = strokeWidth > 0 && canAdjustLiteralPaintOpacity(strokeColor);

  if (compactSection && strokeWidth <= 0) return null;

  return (
    <>
      <div ref={rowRef} className="flex items-center justify-between w-full">
        {!compactSection && <ControlLabel label="Stroke" property="WebkitTextStroke" />}
        {strokeWidth > 0 ? (
          <div className="w-full min-w-0">
            <PaintRow
              control={<ControlActionRow onClick={() => setIsOpen(true)} embedded><ColorSwatch style={{ backgroundColor: strokeColor }} /><span className="text-xs truncate flex-1 text-left">{toHexDisplay(strokePaint.base).replace(/^#/, '')}</span></ControlActionRow>}
              opacity={strokePaint.opacity}
              opacityDisabled={!canEditOpacity}
              onOpacityChange={canEditOpacity ? (value) => setStroke(strokeWidth, serializeLiteralPaintOpacity(strokeColor, value)) : undefined}
              onOpacityChangeLive={canEditOpacity ? (value) => setStrokeLive(strokeWidth, serializeLiteralPaintOpacity(strokeColor, value)) : undefined}
              onRemove={() => setStroke(0, strokeColor)}
              opacityLabel="Text stroke opacity"
            />
          </div>
        ) : (
          <ControlActionRow onClick={() => setIsOpen(true)}><TextStrokeIcon width={20} height={20} bg="var(--control-border)" className="shrink-0 opacity-50" /><span className="text-[var(--text-secondary)]">Add</span></ControlActionRow>
        )}
      </div>
      <ToolPopup isOpen={isOpen} onClose={() => setIsOpen(false)} title="Text stroke" anchorRef={rowRef} kind="options">
        <OptionsPanel>
          <OptionSection title="Appearance">
            <PaintOptionRow
              label="Color"
              value={strokeColor}
              onChange={(c) => setStroke(strokeWidth || 1, c)}
              onChangeLive={(c) => setStrokeLive(strokeWidth || 1, c)}
            />
            <ScalarRow
              label="Width"
              value={strokeWidth}
              min={0}
              max={10}
              step={0.5}
              unit="px"
              onChange={(v) => setStroke(v, strokeColor)}
              onChangeLive={(v) => setStrokeLive(v, strokeColor)}
              onCommit={(v) => setStroke(v, strokeColor)}
            />
          </OptionSection>
          <p className="text-[10px] leading-4 text-[var(--text-disabled)]">
            Text stroke uses the web text-stroke model, so box and vector stroke-position controls do not apply here.
          </p>
        </OptionsPanel>
      </ToolPopup>
    </>
  );
}
