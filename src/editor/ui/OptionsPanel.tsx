import type { ReactNode } from 'react';
import ToolInput from '@/editor/controls/ToolInput';
import ToolSlider from '@/editor/controls/ToolSlider';
import ToolSegmentedControl from '@/editor/controls/ToolSegmentedControl';
import ColorInput from '@/editor/controls/ColorInput';

export function OptionsPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div data-options-panel className={`flex flex-col gap-2.5 ${className}`}>{children}</div>;
}

/**
 * Settings-inspired shell for effect editors. Effects are small enough to
 * benefit from visible semantic grouping, but still use compact Inspector
 * controls inside each group instead of turning into full Settings forms.
 */
export function EffectOptionsPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div data-effect-options-panel className={`flex flex-col gap-2.5 ${className}`}>{children}</div>;
}

export type InspectorSectionGlyphKind =
  | 'typography'
  | 'formatting'
  | 'flow'
  | 'opentype'
  | 'spacing'
  | 'style'
  | 'geometry'
  | 'blur'
  | 'adjustments'
  | 'color'
  | 'paint';

export function InspectorSectionGlyph({ kind }: { kind: InspectorSectionGlyphKind }) {
  const common = {
    width: 13,
    height: 13,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (kind === 'typography') return <svg {...common}><path d="M3 3h10M8 3v10M5.5 13h5" /></svg>;
  if (kind === 'formatting') return <svg {...common}><path d="M3 4h10M3 8h7M3 12h5" /><circle cx="12.5" cy="8" r="1.5" /></svg>;
  if (kind === 'flow') return <svg {...common}><path d="M3 4h8a2 2 0 0 1 0 4H5a2 2 0 0 0 0 4h8" /><path d="m11 10 2 2-2 2" /></svg>;
  if (kind === 'opentype') return <svg {...common}><path d="M3 12 6.4 4h3.2L13 12M4.5 9h7" /><circle cx="12.5" cy="4" r="1" fill="currentColor" stroke="none" /></svg>;
  if (kind === 'spacing') return <svg {...common}><path d="M3 4h10M3 12h10M5 6.5v3M11 6.5v3" /><path d="m4 8 1-1 1 1M10 8l1-1 1 1" /></svg>;
  if (kind === 'style') return <svg {...common}><path d="M3 5.25h10M5.25 2.75v5M10.75 8.25v5M3 10.75h10" /><circle cx="5.25" cy="5.25" r="1.25" fill="currentColor" stroke="none" /><circle cx="10.75" cy="10.75" r="1.25" fill="currentColor" stroke="none" /></svg>;
  if (kind === 'geometry') return <svg {...common}><path d="M8 2.5v11M2.5 8h11" /><path d="m5.5 4.5 2.5-2 2.5 2M5.5 11.5l2.5 2 2.5-2M4.5 5.5l-2 2.5 2 2.5M11.5 5.5l2 2.5-2 2.5" /></svg>;
  if (kind === 'blur') return <svg {...common}><circle cx="8" cy="8" r="2.2" /><circle cx="8" cy="8" r="4.3" opacity=".62" /><circle cx="8" cy="8" r="6" opacity=".28" /></svg>;
  if (kind === 'adjustments') return <svg {...common}><path d="M3 3v10M8 3v10M13 3v10" /><path d="M1.75 6h2.5M6.75 10h2.5M11.75 5h2.5" /></svg>;
  if (kind === 'color') return <svg {...common}><circle cx="8" cy="8" r="5.25" /><path d="M8 2.75a5.25 5.25 0 0 1 0 10.5Z" fill="currentColor" stroke="none" opacity=".65" /></svg>;
  return <svg {...common}><path d="M8 2.25c1.65 2.1 3.5 4.15 3.5 6.45A3.5 3.5 0 1 1 4.5 8.7C4.5 6.4 6.35 4.35 8 2.25Z" /><path d="M6.5 10.1c.4.45.9.7 1.5.7" /></svg>;
}

export function EffectPreviewFrame({
  children,
  details,
  hint,
}: {
  children: ReactNode;
  details?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <section
      data-effect-live-preview
      className="overflow-hidden rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55"
    >
      <div className="flex min-h-7 items-center justify-between gap-2 border-b border-[var(--border-light)] px-2.5 py-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Preview</span>
        {details ? <span className="truncate text-[9px] tabular-nums text-[var(--text-secondary)]">{details}</span> : null}
      </div>
      <div className="relative flex min-h-[76px] items-center justify-center overflow-hidden bg-[var(--bg-hover)]/16 p-3">
        {children}
      </div>
      {hint ? (
        <div className="border-t border-[var(--border-light)] px-2.5 py-1.5 text-[8px] leading-3 text-[var(--text-disabled)]">
          {hint}
        </div>
      ) : null}
    </section>
  );
}

export function EffectOptionSection({
  title,
  glyph,
  action,
  children,
}: {
  title: string;
  glyph?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      data-effect-option-section
      className="overflow-hidden rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-hover)]/10"
    >
      <div className="flex min-h-7 items-center justify-between gap-2 border-b border-[var(--border-light)] px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-[var(--text-primary)]">
          {glyph ? <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--text-secondary)]">{glyph}</span> : null}
          <span className="truncate">{title}</span>
        </span>
        {action}
      </div>
      <div className="flex flex-col gap-2.5 bg-[var(--bg-surface)]/45 p-3">
        {children}
      </div>
    </section>
  );
}

export function EffectOptionAction({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-effect-option-action
      onClick={onClick}
      disabled={disabled}
      className="h-6 rounded-[4px] px-2 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function OptionSection({
  title,
  glyph,
  action,
  children,
  divided = false,
}: {
  title?: string;
  glyph?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  divided?: boolean;
}) {
  return (
    <section
      data-option-section
      data-option-section-divided={divided || undefined}
      className="overflow-hidden rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-hover)]/10"
    >
      {(title || action) && (
        <div className="flex min-h-7 items-center justify-between gap-2 border-b border-[var(--border-light)] px-3 py-1.5">
          {title ? (
            <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-[var(--text-primary)]">
              {glyph ? <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--text-secondary)]">{glyph}</span> : null}
              <span className="truncate">{title}</span>
            </span>
          ) : <span />}
          {action}
        </div>
      )}
      <div className="flex flex-col gap-2.5 bg-[var(--bg-surface)]/45 p-3">
        {children}
      </div>
    </section>
  );
}

function OptionLabel({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
      {icon ? <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

function numberFromInput(raw: string, fallback: number): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function ScalarRow({
  label,
  icon,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  hideLabel = false,
  disabled = false,
  onChange,
  onChangeLive,
  onCommit,
}: {
  label: string;
  icon?: ReactNode;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
  onChangeLive?: (value: number) => void;
  onCommit?: (value: number) => void;
}) {
  const commit = onCommit ?? onChange;
  const live = onChangeLive ?? onChange;
  const parse = (raw: string) => Math.max(min, Math.min(max, numberFromInput(raw, value)));

  return (
    <div data-option-scalar className={hideLabel ? 'w-full' : 'grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2'}>
      {!hideLabel && <OptionLabel icon={icon}>{label}</OptionLabel>}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_64px] items-center gap-2">
        <ToolSlider
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={live}
          onCommit={commit}
        />
        <ToolInput
          value={`${value}${unit}`}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          chevronLabel={unit || undefined}
          ariaLabel={label}
          onChange={(raw) => onChange(parse(raw))}
          onChangeLive={onChangeLive ? (raw) => onChangeLive(parse(raw)) : undefined}
          onCommit={onChangeLive || onCommit ? (raw) => commit(parse(raw)) : undefined}
          className="min-w-0"
        />
      </div>
    </div>
  );
}

export function OptionFieldRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-option-field className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2">
      <OptionLabel icon={icon}>{label}</OptionLabel>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ChoiceRow({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon?: ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div data-option-choice className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2">
      <OptionLabel icon={icon}>{label}</OptionLabel>
      <ToolSegmentedControl value={value} options={options} onChange={onChange} size="sm" />
    </div>
  );
}

export function PaintOptionRow({
  label,
  value,
  onChange,
  onChangeLive,
  showAlpha = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onChangeLive?: (value: string) => void;
  showAlpha?: boolean;
}) {
  return (
    <div data-option-paint className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2">
      <OptionLabel>{label}</OptionLabel>
      <ColorInput value={value} onChange={onChange} onChangeLive={onChangeLive} showAlpha={showAlpha} />
    </div>
  );
}

export function SpatialRow({ label, icon, children }: { label?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div data-option-spatial className={label ? 'grid grid-cols-[64px_minmax(0,1fr)] items-start gap-2' : 'w-full'}>
      {label ? <OptionLabel icon={icon}>{label}</OptionLabel> : null}
      <div className="grid min-w-0 grid-cols-2 gap-1">{children}</div>
    </div>
  );
}

export function OptionEntryRow({
  leading,
  label,
  meta,
  trailing,
  onClick,
}: {
  leading?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      {leading ? <span className="flex h-4 w-4 shrink-0 items-center justify-center">{leading}</span> : null}
      <span className="min-w-0 flex-1 truncate text-left text-[11px] text-[var(--text-primary)]">{label}</span>
      {meta ? <span className="shrink-0 text-[10px] text-[var(--text-secondary)]">{meta}</span> : null}
      {trailing}
    </>
  );
  const cls = "flex h-[var(--control-height)] w-full min-w-0 items-center gap-2 rounded-[4px] bg-[var(--control-bg)] px-2";
  return onClick
    ? <button type="button" data-option-entry onClick={onClick} className={`${cls} hover:bg-[var(--control-bg-hover)]`}>{content}</button>
    : <div data-option-entry className={cls}>{content}</div>;
}
