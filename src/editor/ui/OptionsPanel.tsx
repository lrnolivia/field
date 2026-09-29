import type { ReactNode } from 'react';
import ToolInput from '@/editor/controls/ToolInput';
import ToolSlider from '@/editor/controls/ToolSlider';
import ToolSegmentedControl from '@/editor/controls/ToolSegmentedControl';
import ColorInput from '@/editor/controls/ColorInput';

export function OptionsPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div data-options-panel className={`flex flex-col gap-2.5 ${className}`}>{children}</div>;
}

export function OptionSection({
  title,
  action,
  children,
  divided = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  divided?: boolean;
}) {
  return (
    <section
      data-option-section
      className={`flex flex-col gap-2 ${divided ? 'border-t border-[var(--border-light)] pt-2.5' : ''}`}
    >
      {(title || action) && (
        <div className="flex min-h-[20px] items-center justify-between gap-2">
          {title ? <span className="text-[10px] font-medium text-[var(--text-secondary)]">{title}</span> : <span />}
          {action}
        </div>
      )}
      {children}
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
