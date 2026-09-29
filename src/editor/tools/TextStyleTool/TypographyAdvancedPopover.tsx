import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ToolInput, ToolSegmentedControl, ToolSelect } from '../../controls';
import { useControl } from '../../controls/ControlProvider';
import { AlignControl, DecorationControl } from './atoms';
import ToolPopup from '../../ui/ToolPopup';
import { InspectorSectionGlyph, OptionSection } from '../../ui/OptionsPanel';

type Tab = 'basics' | 'details';

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 items-center min-h-[var(--control-height)]">
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

function TypographyPreview({
  text,
  style,
  sourceFontSize,
}: {
  text: string;
  style: CSSProperties;
  sourceFontSize: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fitFontSize, setFitFontSize] = useState(() => Math.min(32, Math.max(14, sourceFontSize)));
  const previewHeight = text.length > 72 ? 82 : text.length > 36 ? 72 : 64;

  const fit = useCallback(() => {
    const box = boxRef.current;
    const sample = textRef.current;
    if (!box || !sample) return;

    const min = 12;
    const max = Math.min(34, Math.max(16, sourceFontSize));
    let low = min;
    let high = max;
    let best = min;

    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      sample.style.fontSize = `${mid}px`;
      const fits = sample.scrollWidth <= box.clientWidth - 2 && sample.scrollHeight <= box.clientHeight - 2;
      if (fits) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    setFitFontSize(Math.round(best * 10) / 10);
  }, [sourceFontSize, text]);

  useLayoutEffect(() => {
    fit();
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [fit]);

  return (
    <div
      ref={boxRef}
      data-typography-preview
      data-typography-preview-fit
      className="flex w-full items-center justify-center overflow-hidden rounded-[7px] bg-[var(--bg-hover)]/55 px-3 py-2 text-center text-[var(--text-primary)]"
      style={{ height: previewHeight }}
    >
      <span
        ref={textRef}
        className="block max-w-full break-words"
        style={{ ...style, fontSize: `${fitFontSize}px` }}
      >
        {text}
      </span>
    </div>
  );
}

export default function TypographyAdvancedPopover() {
  const { node, styles, updateStyle, updateMultipleStyles } = useControl();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('basics');
  const anchorRef = useRef<HTMLButtonElement>(null);

  const closeWithFocus = () => {
    setOpen(false);
    requestAnimationFrame(() => anchorRef.current?.focus({ preventScroll: true }));
  };

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
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
          <path d="M4 2v12M12 2v12M2 5h4M10 11h4" />
          <circle cx="4" cy="5" r="1.5" fill="var(--dropdown-bg)" />
          <circle cx="12" cy="11" r="1.5" fill="var(--dropdown-bg)" />
        </svg>
      </button>

      <ToolPopup
        isOpen={open}
        onClose={closeWithFocus}
        title="Typography options"
        ariaLabel="Typography options"
        anchorRef={anchorRef}
        width={320}
        kind="options"
        outsidePointerMode="close"
        hideHeader
        contentClassName="w-full flex-shrink-0 overflow-y-auto overflow-x-hidden scrollbar-hide"
      >
        <div
          data-typography-advanced-popover
          className="w-full"
        >
          <div className="h-11 px-2.5 flex items-center gap-2 border-b border-[var(--border-light)] bg-[var(--bg-surface)]">
            <div className="flex items-center gap-0.5 rounded-[7px] bg-[var(--bg-hover)]/65 p-0.5">
              <button
                type="button"
                onClick={() => setTab('basics')}
                className={`h-7 px-2.5 rounded-[6px] text-xs ${tab === 'basics' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                Basics
              </button>
              <button
                type="button"
                onClick={() => setTab('details')}
                className={`h-7 px-2.5 rounded-[6px] text-xs ${tab === 'details' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                Details
              </button>
            </div>
            <button
              type="button"
              onClick={closeWithFocus}
              className="ml-auto w-7 h-7 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-[var(--control-radius)]"
              aria-label="Close typography options"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="m3 3 10 10M13 3 3 13" /></svg>
            </button>
          </div>

          {tab === 'basics' ? (
            <div className="p-3 flex flex-col gap-2.5">
              <OptionSection
                title="Preview"
                glyph={<InspectorSectionGlyph kind="typography" />}
                action={<span className="text-[10px] tabular-nums text-[var(--text-tertiary)]">{Math.round(Math.max(1, Number.parseFloat(styles.fontSize || '28') || 28))} px</span>}
              >
                <TypographyPreview text={previewText} style={previewStyle} sourceFontSize={Math.max(1, Number.parseFloat(styles.fontSize || '28') || 28)} />
              </OptionSection>

              <OptionSection title="Formatting" glyph={<InspectorSectionGlyph kind="formatting" />}>
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
              </OptionSection>

              <OptionSection title="Flow" glyph={<InspectorSectionGlyph kind="flow" />}>
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
              </OptionSection>
            </div>
          ) : (
            <div className="p-3 flex flex-col gap-2.5">
              <OptionSection title="OpenType" glyph={<InspectorSectionGlyph kind="opentype" />}>
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
              </OptionSection>

              <OptionSection title="Features" glyph={<InspectorSectionGlyph kind="style" />}>
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
              </OptionSection>

              <OptionSection title="Spacing & writing" glyph={<InspectorSectionGlyph kind="spacing" />}>
                <FieldRow label="Letter spacing">
                  <ToolInput
                    value={styles.letterSpacing || '0'}
                    onChange={(value) => updateStyle('letterSpacing', value)}
                    ariaLabel="Letter spacing"
                  />
                </FieldRow>

                <FieldRow label="Writing mode">
                  <ToolSelect
                    value={styles.writingMode || 'horizontal-tb'}
                    onChange={(value) => updateStyle('writingMode', value === 'horizontal-tb' ? '' : value)}
                    options={WRITING_MODE_OPTIONS}
                  />
                </FieldRow>
                <DecorationControl />
              </OptionSection>
            </div>
          )}
        </div>
      </ToolPopup>
    </>
  );
}
