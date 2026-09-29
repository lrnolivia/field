import type { ReactNode } from 'react';

export type ChromeTabGlyphName =
  | 'design'
  | 'prototype'
  | 'search'
  | 'upload'
  | 'create'
  | 'cube'
  | 'media'
  | 'layout'
  | 'behavior';

export interface ChromeTabItem<T extends string> {
  value: T;
  label: string;
  glyph?: ChromeTabGlyphName | ReactNode;
  disabled?: boolean;
}

function Glyph({ name }: { name: ChromeTabGlyphName }) {
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
  if (name === 'design') return <svg {...common}><rect x="3" y="3" width="10" height="10" rx="1.8" /><path d="M5.5 5.5h5v5h-5z" /></svg>;
  if (name === 'prototype') return <svg {...common}><circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="12" r="1.5" /><path d="M5.5 7.4 10.5 4.6M5.5 8.6l5 2.8" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="7" cy="7" r="3.75" /><path d="m10 10 3 3" /></svg>;
  if (name === 'upload') return <svg {...common}><path d="M8 10.5V3.5M5.5 6 8 3.5 10.5 6" /><path d="M3 10.25v1.5A1.25 1.25 0 0 0 4.25 13h7.5A1.25 1.25 0 0 0 13 11.75v-1.5" /></svg>;
  if (name === 'create') return <svg {...common}><path d="m8 2 .8 2.2L11 5l-2.2.8L8 8l-.8-2.2L5 5l2.2-.8L8 2Z" /><path d="m12 9 .5 1.4L14 11l-1.5.6L12 13l-.5-1.4L10 11l1.5-.6L12 9Z" /></svg>;
  if (name === 'cube') return <svg {...common}><path d="m8 2.5 4.5 2.4v5.2L8 13.5l-4.5-3.4V4.9L8 2.5Z" /><path d="m3.5 4.9 4.5 2.6 4.5-2.6M8 7.5v6" /></svg>;
  if (name === 'media') return <svg {...common}><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><circle cx="5.25" cy="5.5" r="1" /><path d="m4 11 2.8-2.8L9 10.4l1.4-1.4 2.2 2.2" /></svg>;
  if (name === 'layout') return <svg {...common}><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="M7 2.5v11M7 7.5h6.5" /></svg>;
  return <svg {...common}><path d="M3 4h10M5 8h6M6.5 12h3" /><circle cx="5" cy="4" r="1" fill="currentColor" stroke="none" /><circle cx="10.5" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
}

export default function ChromeTabBar<T extends string>({
  value,
  items,
  onChange,
  ariaLabel,
  stretch = false,
  compact = false,
  semantic = 'tabs',
}: {
  value: T;
  items: readonly ChromeTabItem<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  stretch?: boolean;
  compact?: boolean;
  semantic?: 'tabs' | 'steps';
}) {
  return (
    <div
      data-chrome-tabbar
      role={semantic === 'tabs' ? 'tablist' : 'navigation'}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-0.5 rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-hover)]/32 p-0.5 ${stretch ? 'w-full' : ''}`}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role={semantic === 'tabs' ? 'tab' : undefined}
            aria-selected={semantic === 'tabs' ? active : undefined}
            aria-current={semantic === 'steps' && active ? 'step' : undefined}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={`relative flex min-w-0 items-center justify-center gap-1.5 rounded-[6px] border border-transparent font-medium transition-[background-color,color,border-color,box-shadow] disabled:cursor-not-allowed disabled:opacity-35 ${stretch ? 'flex-1' : ''} ${compact ? 'h-7 px-2 text-[10px]' : 'h-8 px-3 text-[11px]'} ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]/70 hover:text-[var(--text-primary)]'}`}
            style={active ? {
              background: 'var(--accent-surface)',
              borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-light))',
              boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
            } : undefined}
          >
            {item.glyph && (
              <span
                aria-hidden
                className="flex h-4 w-4 shrink-0 items-center justify-center"
                style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
              >
                {typeof item.glyph === 'string' ? <Glyph name={item.glyph as ChromeTabGlyphName} /> : item.glyph}
              </span>
            )}
            <span className="truncate">{item.label}</span>
            {active && <span aria-hidden className="absolute inset-x-2.5 bottom-[2px] h-[2px] rounded-full bg-[var(--accent)] opacity-70" />}
          </button>
        );
      })}
    </div>
  );
}
