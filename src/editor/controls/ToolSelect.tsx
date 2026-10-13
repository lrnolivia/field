// ToolSelect.tsx — Field-native dropdown. No label — use ToolRow for that.

import { trace } from '@/shared/debug-trace';
import FieldSelect from './FieldSelect';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  className?: string;
  /** Disable the whole control (e.g. a primary-only field on a replica). */
  disabled?: boolean;
  /** Accessible name for dropdowns whose visual label is outside the select. */
  ariaLabel?: string;
}

export default function ToolSelect({ value, onChange, options, className, disabled, ariaLabel }: Props) {
  return (
    <FieldSelect
      value={value}
      onChange={(next) => {
        trace.action('tool-select:change', { from: value, to: next });
        onChange(next);
      }}
      options={options}
      className={`w-full ${className || ''}`}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  );
}
