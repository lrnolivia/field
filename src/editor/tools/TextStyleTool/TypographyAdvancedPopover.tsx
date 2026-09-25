import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import { ToolInput, ToolSegmentedControl, ToolSelect } from '../../controls';
import { useControl } from '../../controls/ControlProvider';
import { AlignControl, DecorationControl } from './atoms';

type Tab = 'basics' | 'details';

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2 items-center min-h-[var(--control-height)]">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const NUMBER_STYLE_OPTIONS = [
  { value: 'normal', label: 'Default' },
  { value: 'lining-nums', label: 'Lining' },
  { value: 'oldstyle-nums', label: 'Oldstyle' },
  { value: 'proportional-nums', label: 'Proportional' },
  { value: 'tabular-nums', label: 'Tabular' },
];

const CAPS_OPTIONS = [
  { value: 'normal', label: 'Default' },
  { value: 'small-caps', label: 'Small caps' },
  { value: 'all-small-caps', label: 'All small caps' },
  { value: 'petite-caps', label: 'Petite caps' },
];

const LIGATURE_OPTIONS = [
  { value: 'normal', label: 'Default' },
  { value: 'none', label: 'None' },
  { value: 'common-ligatures', label: 'Common' },
  { value: 'no-common-ligatures', label: 'No common' },
];

const WRAP_OPTIONS = [
  { value: 'normal', label: 'Wrap' },
  { value: 'nowrap', label: 'No wrap' },
  { value: 'pre-wrap', label: 'Preserve' },
  { value: 'break-spaces', label: 'Break spaces' },
];

const WRITING_MODE_OPTIONS = [
  { value: 'horizontal-tb', label: 'Horizontal' },
  { value: 'vertical-rl', label: 'Vertical RL' },
  { value: 'vertical-lr', label: 'Vertical LR' },
];

function clampParagraphSpacing(raw: string): string {
  return `${Math.max(0, Number.parseFloat(raw) || 0)}px`;
}

function plainPreviewText(raw: unknown, fallback: string): string {
  const value = typeof raw === 'string' ? raw : '';
  const plain = value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (plain || fallback || 'Ag').slice(0, 140);
}

export default function TypographyAdvancedPopover() {
  const { node, styles, updateStyle, updateMultipleStyles } = useControl();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('basics');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const width = 320;
    const gap = 8;
    let x = rect.left - width - gap;
    if (x < 12) x = rect.right + gap;
    let y = rect.top - 22;
    y = Math.max(12, Math.min(y, window.innerHeight - 620));
    setPos({ x, y });

    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!popRef.current?.contains(target) && !anchorRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener('pointerdown', outside, true);
    return () => window.removeEventListener('pointerdown', outside, true);
  }, [open]);

  const trimOn = styles.textBoxTrim === 'trim-both';
  const truncated = styles.textOverflow === 'ellipsis' && styles.whiteSpace === 'nowrap';
  const paragraphSpacing = useMemo(() => String(parseFloat(styles.marginBottom || '0') || 0), [styles.marginBottom]);
  const previewText = useMemo(
    () => plainPreviewText(node?.textContent, node?.name || node?.type || 'Ag'),
    [node?.textContent, node?.name, node?.type],
  );

  const numericTokens = (styles.fontVariantNumeric || '')
    .split(/\s+/)
    .map(v => v.trim())
    .filter(Boolean)
    .filter(v => v !== 'normal');
  const numberStyle = NUMBER_STYLE_OPTIONS.find(option => numericTokens.includes(option.value))?.value || 'normal';
  const ordinalOn = numericTokens.includes('ordinal');

  const updateNumberStyle = (value: string) => {
    const preserved: string[] = numericTokens.filter(token => token === 'ordinal' || token === 'slashed-zero');
    if (value !== 'normal') preserved.unshift(value);
    updateStyle('fontVariantNumeric', preserved.join(' '));
  };

  const updateOrdinals = (enabled: boolean) => {
    const next = numericTokens.filter(token => token !== 'ordinal');
    if (enabled) next.push('ordinal');
    updateStyle('fontVariantNumeric', next.join(' '));
  };

  const previewStyle = {
    fontFamily: styles.fontFamily || undefined,
    fontSize: styles.fontSize || '28px',
    fontWeight: styles.fontWeight || undefined,
    lineHeight: styles.lineHeight || 1.15,
    letterSpacing: styles.letterSpacing || undefined,
    textTransform: styles.textTransform || 'none',
    textDecorationLine: styles.textDecorationLine || 'none',
  } as CSSProperties;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        data-typography-options
        onClick={() => setOpen(v => !v)}
        className={`h-[var(--control-height)] w-8 flex items-center justify-center rounded-[var(--control-radius)] ${open ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
        title="Typography options"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
          <path d="M4 2v12M12 2v12M2 5h4M10 11h4" />
          <circle cx="4" cy="5" r="1.5" fill="var(--dropdown-bg)" />
          <circle cx="12" cy="11" r="1.5" fill="var(--dropdown-bg)" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          data-typography-advanced-popover
          className="fixed z-[100100] w-[320px] max-h-[calc(100vh-24px)] overflow-y-auto bg-[var(--dropdown-bg)] border border-[var(--border-light)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]"
          style={{ left: pos.x, top: pos.y }}
        >
          <div className="h-10 px-2 flex items-center gap-1 border-b border-[var(--border-light)]">
            <button
              type="button"
              onClick={() => setTab('basics')}
              className={`h-7 px-2.5 rounded-[var(--control-radius)] text-xs ${tab === 'basics' ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              Basics
            </button>
            <button
              type="button"
              onClick={() => setTab('details')}
              className={`h-7 px-2.5 rounded-[var(--control-radius)] text-xs ${tab === 'details' ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto w-7 h-7 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-[var(--control-radius)]"
              aria-label="Close typography options"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="m3 3 10 10M13 3 3 13" /></svg>
            </button>
          </div>

          {tab === 'basics' ? (
            <div className="p-3 flex flex-col gap-3">
              <div data-typography-preview className="min-h-[124px] px-4 py-3 rounded-[var(--control-radius)] bg-[var(--bg-hover)] flex items-center justify-center overflow-hidden text-center text-[var(--text-primary)]">
                <span className="max-w-full break-words" style={previewStyle}>{previewText}</span>
              </div>

              <FieldRow label="Alignment"><AlignControl compact /></FieldRow>

              <FieldRow label="Decoration">
                <ToolSegmentedControl
                  value={styles.textDecorationLine || 'none'}
                  onChange={(value) => updateStyle('textDecorationLine', value === 'none' ? '' : value)}
                  options={[
                    { value: 'none', label: '—' },
                    { value: 'underline', label: 'U̲' },
                    { value: 'line-through', label: 'S̶' },
                  ]}
                  size="sm"
                />
              </FieldRow>

              <FieldRow label="Case">
                <ToolSegmentedControl
                  value={styles.textTransform || 'none'}
                  onChange={(value) => updateStyle('textTransform', value === 'none' ? '' : value)}
                  options={[
                    { value: 'none', label: '—' },
                    { value: 'uppercase', label: 'TT' },
                    { value: 'lowercase', label: 'tt' },
                    { value: 'capitalize', label: 'Tt' },
                  ]}
                  size="sm"
                />
              </FieldRow>

              <FieldRow label="Vertical trim">
                <ToolSegmentedControl
                  value={trimOn ? 'trim' : 'none'}
                  onChange={(value) => updateMultipleStyles(value === 'trim'
                    ? { textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic' }
                    : { textBoxTrim: '', textBoxEdge: '' })}
                  options={[{ value: 'none', label: '—' }, { value: 'trim', label: 'Ag' }]}
                  size="sm"
                />
              </FieldRow>

              <FieldRow label="List style">
                <ToolSegmentedControl
                  value={styles.listStyleType || 'none'}
                  onChange={(value) => updateStyle('listStyleType', value === 'none' ? '' : value)}
                  options={[
                    { value: 'none', label: '—' },
                    { value: 'disc', label: '•' },
                    { value: 'decimal', label: '1.' },
                  ]}
                  size="sm"
                />
              </FieldRow>

              <FieldRow label="Paragraph spacing">
                <ToolInput
                  value={paragraphSpacing}
                  onChange={(value) => updateStyle('marginBottom', clampParagraphSpacing(value))}
                  min={0}
                  ariaLabel="Paragraph spacing"
                />
              </FieldRow>

              <FieldRow label="Truncate text">
                <ToolSegmentedControl
                  value={truncated ? 'yes' : 'no'}
                  onChange={(value) => updateMultipleStyles(value === 'yes'
                    ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                    : { overflow: '', textOverflow: '', whiteSpace: 'normal' })}
                  options={[{ value: 'no', label: '—' }, { value: 'yes', label: 'A…' }]}
                  size="sm"
                />
              </FieldRow>

              <FieldRow label="Wrap style">
                <ToolSelect
                  value={styles.whiteSpace || 'normal'}
                  onChange={(value) => updateStyle('whiteSpace', value === 'normal' ? '' : value)}
                  options={WRAP_OPTIONS}
                />
              </FieldRow>
            </div>
          ) : (
            <div className="p-3 flex flex-col gap-2.5">
              <FieldRow label="Numbers">
                <ToolSelect value={numberStyle} onChange={updateNumberStyle} options={NUMBER_STYLE_OPTIONS} />
              </FieldRow>

              <FieldRow label="Position">
                <ToolSegmentedControl
                  value={styles.fontVariantPosition || 'normal'}
                  onChange={(value) => updateStyle('fontVariantPosition', value === 'normal' ? '' : value)}
                  options={[
                    { value: 'normal', label: '—' },
                    { value: 'sub', label: 'X₂' },
                    { value: 'super', label: 'X²' },
                  ]}
                  size="sm"
                />
              </FieldRow>

              <FieldRow label="Letterforms">
                <ToolSelect
                  value={styles.fontVariantCaps || 'normal'}
                  onChange={(value) => updateStyle('fontVariantCaps', value === 'normal' ? '' : value)}
                  options={CAPS_OPTIONS}
                />
              </FieldRow>

              <FieldRow label="Ligatures">
                <ToolSelect
                  value={styles.fontVariantLigatures || 'normal'}
                  onChange={(value) => updateStyle('fontVariantLigatures', value === 'normal' ? '' : value)}
                  options={LIGATURE_OPTIONS}
                />
              </FieldRow>

              <FieldRow label="Ordinals">
                <ToolSegmentedControl
                  value={ordinalOn ? 'on' : 'off'}
                  onChange={(value) => updateOrdinals(value === 'on')}
                  options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]}
                  size="sm"
                />
              </FieldRow>

              <FieldRow label="Kerning">
                <ToolSegmentedControl
                  value={styles.fontKerning || 'auto'}
                  onChange={(value) => updateStyle('fontKerning', value === 'auto' ? '' : value)}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'normal', label: 'On' },
                    { value: 'none', label: 'Off' },
                  ]}
                  size="sm"
                />
              </FieldRow>

              <FieldRow label="Stylistic sets">
                <ToolInput
                  value={styles.fontFeatureSettings || ''}
                  onChange={(value) => updateStyle('fontFeatureSettings', value)}
                  text
                  placeholder='"ss01" 1'
                  ariaLabel="Font feature settings"
                />
              </FieldRow>

              <FieldRow label="Variation axes">
                <ToolInput
                  value={styles.fontVariationSettings || ''}
                  onChange={(value) => updateStyle('fontVariationSettings', value)}
                  text
                  placeholder='"wght" 500'
                  ariaLabel="Font variation settings"
                />
              </FieldRow>

              <div className="pt-1 text-xs font-semibold text-[var(--text-primary)]">Horizontal spacing</div>
              <FieldRow label="Letter spacing">
                <ToolInput
                  value={styles.letterSpacing || '0'}
                  onChange={(value) => updateStyle('letterSpacing', value)}
                  ariaLabel="Letter spacing"
                />
              </FieldRow>

              <div className="border-t border-[var(--border-light)] pt-2 mt-0.5 flex flex-col gap-2.5">
                <FieldRow label="Writing mode">
                  <ToolSelect
                    value={styles.writingMode || 'horizontal-tb'}
                    onChange={(value) => updateStyle('writingMode', value === 'horizontal-tb' ? '' : value)}
                    options={WRITING_MODE_OPTIONS}
                  />
                </FieldRow>
                <DecorationControl />
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
