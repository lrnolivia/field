// ScaleTool.tsx — compact right-inspector controls for dedicated Scale.

import { useCallback, useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { selectedIdsAtom, nodeStylesVersionAtom } from '@/code/stores/store';
import { getContentRoot } from '@/canvas/node-ops';
import { measureScaleSelection, scaleSelectionByFactor } from '@/canvas/scale/scale-operation';
import { formatScaleNumber, type ScaleAnchor } from '@/canvas/scale/scale-math';

const ANCHORS: ScaleAnchor[] = [
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

function numeric(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ScaleTool({ vpId }: { vpId: string }) {
  const ids = useAtomValue(selectedIdsAtom);
  // Re-measure after authored writes without subscribing to the whole node map.
  useAtomValue(nodeStylesVersionAtom);
  const [anchor, setAnchor] = useState<ScaleAnchor>('center');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [multiplier, setMultiplier] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const measurement = measureScaleSelection(ids, vpId);
    if (!measurement) {
      setWidth('');
      setHeight('');
      return;
    }
    setWidth(formatScaleNumber(measurement.width, 2));
    setHeight(formatScaleNumber(measurement.height, 2));
  }, [ids, vpId]);

  useEffect(() => {
    refresh();
    setMultiplier('1');
    setError(null);
  }, [refresh]);

  const commitFactor = useCallback((factor: number) => {
    if (!Number.isFinite(factor) || factor <= 0) {
      setError('Scale must be greater than 0.');
      refresh();
      setMultiplier('1');
      return;
    }
    if (Math.abs(factor - 1) < 1e-9) {
      setError(null);
      refresh();
      setMultiplier('1');
      return;
    }
    const result = scaleSelectionByFactor({
      ids,
      vpId,
      factor,
      anchor,
      contentEl: getContentRoot(),
    });
    if (!result.ok) {
      setError(result.reason.replace(/-/g, ' '));
      refresh();
      setMultiplier('1');
      return;
    }
    setError(null);
    setMultiplier('1');
    requestAnimationFrame(refresh);
  }, [ids, vpId, anchor, refresh]);

  const commitWidth = () => {
    const next = numeric(width);
    const current = measureScaleSelection(ids, vpId);
    if (!next || next <= 0 || !current || current.width <= 0) {
      setError('Width must be greater than 0.');
      refresh();
      return;
    }
    commitFactor(next / current.width);
  };

  const commitHeight = () => {
    const next = numeric(height);
    const current = measureScaleSelection(ids, vpId);
    if (!next || next <= 0 || !current || current.height <= 0) {
      setError('Height must be greater than 0.');
      refresh();
      return;
    }
    commitFactor(next / current.height);
  };

  const commitMultiplier = () => {
    const factor = numeric(multiplier);
    if (factor == null) {
      setError('Enter a numeric Scale factor.');
      setMultiplier('1');
      return;
    }
    commitFactor(factor);
  };

  const inputClass = 'h-6 min-w-0 flex-1 rounded-[4px] border border-[var(--border-light)] bg-[var(--control-bg)] px-1.5 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';

  return (
    <section data-scale-panel className="px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--text-primary)]">Scale</span>
        <span className="text-[10px] text-[var(--text-tertiary)]">K</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <label className="flex min-w-0 items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
          <span className="w-3 shrink-0">W</span>
          <input
            data-scale-width
            className={inputClass}
            inputMode="decimal"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            onBlur={commitWidth}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            aria-label="Scaled width"
          />
        </label>
        <label className="flex min-w-0 items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
          <span className="w-3 shrink-0">H</span>
          <input
            data-scale-height
            className={inputClass}
            inputMode="decimal"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            onBlur={commitHeight}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            aria-label="Scaled height"
          />
        </label>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="w-[44px] shrink-0 text-[10px] text-[var(--text-tertiary)]">Factor</span>
        <input
          data-scale-multiplier
          className={inputClass}
          inputMode="decimal"
          value={multiplier}
          onChange={(e) => setMultiplier(e.target.value)}
          onBlur={commitMultiplier}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          aria-label="Scale multiplier"
        />
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="w-[44px] shrink-0 text-[10px] text-[var(--text-tertiary)]">Anchor</span>
        <div
          data-scale-anchor-grid
          className="grid h-[42px] w-[42px] grid-cols-3 grid-rows-3 gap-[3px] rounded-[4px] border border-[var(--border-light)] p-[4px]"
          role="radiogroup"
          aria-label="Scale anchor"
        >
          {ANCHORS.map((item) => (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={anchor === item}
              aria-label={item}
              title={item}
              onClick={() => setAnchor(item)}
              className="flex items-center justify-center border-0 bg-transparent p-0"
              style={{ cursor: 'pointer' }}
            >
              <span
                aria-hidden
                className="block h-[4px] w-[4px] rounded-full"
                style={{
                  background: anchor === item ? 'var(--accent)' : 'var(--text-tertiary)',
                  opacity: anchor === item ? 1 : 0.55,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div data-scale-error className="mt-2 text-[10px] leading-4" style={{ color: 'var(--error, #e5484d)' }} title={error}>
          {error}
        </div>
      )}
    </section>
  );
}
