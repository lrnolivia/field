import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { ToolInput, ToolSegmentedControl, ToolSelect } from '../../controls';
import { useControl } from '../../controls/ControlProvider';
import { CreateVariableGate } from '../../controls/create-variable-gate';
import { LocalizeGate } from '../../controls/localize-gate';
import {
  AlignControl,
  ContentControl,
  DecorationControl,
  ElementPropertyControl,
  TextFillControl,
} from './atoms';

type Tab = 'basics' | 'details';

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_1.25fr] gap-3 items-center">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function TypographyAdvancedPopover() {
  const { styles, updateStyle, updateMultipleStyles } = useControl();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('basics');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const width = 330;
    const gap = 10;
    let x = rect.left - width - gap;
    if (x < 12) x = rect.right + gap;
    let y = rect.top - 30;
    y = Math.max(12, Math.min(y, window.innerHeight - 560));
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
          className="fixed z-[100100] w-[330px] max-h-[calc(100vh-24px)] overflow-y-auto bg-[var(--dropdown-bg)] border border-[var(--border-light)] rounded-xl shadow-[var(--shadow-lg)]"
          style={{ left: pos.x, top: pos.y }}
        >
          <div className="h-12 px-3 flex items-center gap-1 border-b border-[var(--border-light)]">
            <button
              type="button"
              onClick={() => setTab('basics')}
              className={`px-2.5 py-1.5 rounded-[var(--control-radius)] text-xs ${tab === 'basics' ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
            >
              Basics
            </button>
            <button
              type="button"
              onClick={() => setTab('details')}
              className={`px-2.5 py-1.5 rounded-[var(--control-radius)] text-xs ${tab === 'details' ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto w-8 h-8 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-[var(--control-radius)]"
              aria-label="Close typography options"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="m3 3 10 10M13 3 3 13" /></svg>
            </button>
          </div>

          {tab === 'basics' ? (
            <div className="p-4 flex flex-col gap-4">
              <div className="h-[150px] rounded-lg bg-[var(--bg-hover)] flex items-center justify-center text-lg text-[var(--text-disabled)]">
                Preview
              </div>
              <FieldRow label="Alignment"><AlignControl compact /></FieldRow>
              <DecorationControl />
              <ElementPropertyControl property="textTransform" label="Case" />
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-3">
              <LocalizeGate hidden={false}>
                <CreateVariableGate hidden={false}><ContentControl /></CreateVariableGate>
              </LocalizeGate>

              <FieldRow label="Vertical trim">
                <ToolSegmentedControl
                  value={trimOn ? 'trim' : 'none'}
                  onChange={(v) => updateMultipleStyles(v === 'trim'
                    ? { textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic' }
                    : { textBoxTrim: '', textBoxEdge: '' })}
                  options={[
                    { value: 'none', label: '—' },
                    { value: 'trim', label: 'Ag' },
                  ]}
                  size="sm"
                />
              </FieldRow>

              <FieldRow label="List style">
                <ToolSegmentedControl
                  value={styles.listStyleType || 'none'}
                  onChange={(v) => updateStyle('listStyleType', v === 'none' ? '' : v)}
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
                  onChange={(v) => updateStyle('marginBottom', `${Math.max(0, parseFloat(v) || 0)}px`)}
                  min={0}
                />
              </FieldRow>

              <FieldRow label="Truncate text">
                <ToolSegmentedControl
                  value={truncated ? 'yes' : 'no'}
                  onChange={(v) => updateMultipleStyles(v === 'yes'
                    ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                    : { overflow: '', textOverflow: '', whiteSpace: 'normal' })}
                  options={[
                    { value: 'no', label: '—' },
                    { value: 'yes', label: 'A…' },
                  ]}
                  size="sm"
                />
              </FieldRow>

              <ElementPropertyControl property="whiteSpace" label="Wrap style" />
              <ElementPropertyControl property="writingMode" label="Writing mode" />
              <TextFillControl />
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
