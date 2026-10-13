// PageVariablesModal.tsx — Manage page-level variables (standard typed primitives).
//
// Two-panel modal:
//   Left  — list of variables on the active page + "+ New variable" button
//   Right — create or edit/view form (name, type, default value, optional queryParam)
//
// Variables are typed primitives (number, text, boolean, color). The default
// value control adapts to the type — slider for number, color picker for color,
// segmented yes/no for boolean, plain text input otherwise.
//
// Hidden on component master files (those use props instead) — the trigger
// gates by isComponent before opening this modal, but the modal itself also
// renders an explanatory message if reached on a component file just in case.

import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import Modal from '@/design-system/Modal';
import ColorInput from '../controls/ColorInput';
import ImagePickerInput from '../controls/ImagePickerInput';
import { ToolInput, ToolSegmentedControl, ToolSlider } from '../controls';
import { activeFilePathAtom, isComponentFilePath } from '@/code/project/active-file-store';
import { pageVariablesAtom, pageVariablesModalOpenAtom } from '@/code/stores/page-variables-store';
import { defaultForType, type PageVariable, type PageVariableType } from '@/code/features/page-variables';
import { queueMutation } from '@/code/mutation/mutation-queue';
import { VariableTypeIcon, resolveVariableIconKey } from '../controls/VariableTypeIcon';
import { trace } from '@/shared/debug-trace';
import { expediteStableAtomSync } from '@/canvas/hooks/useStableAtomSync';

// ─── Types & constants ──────────────────────────────────────────────────────

type Mode = 'create' | 'view' | 'empty';

const CAMEL_CASE_RE = /^[a-z][a-zA-Z0-9]*$/;

const TYPE_OPTIONS: Array<{ value: PageVariableType; label: string; icon: ReactNode }> = [
  { value: 'number',  label: 'Number',  icon: <VariableTypeIcon iconKey={resolveVariableIconKey({ pageVarType: 'number' })} size={12} /> },
  { value: 'text',    label: 'Text',    icon: <VariableTypeIcon iconKey={resolveVariableIconKey({ pageVarType: 'text' })} size={12} /> },
  { value: 'boolean', label: 'Boolean', icon: <VariableTypeIcon iconKey={resolveVariableIconKey({ pageVarType: 'boolean' })} size={12} /> },
  { value: 'color',   label: 'Color',   icon: <VariableTypeIcon iconKey={resolveVariableIconKey({ pageVarType: 'color' })} size={12} /> },
  { value: 'image',   label: 'Image',   icon: <VariableTypeIcon iconKey={resolveVariableIconKey({ pageVarType: 'image' })} size={12} /> },
];

function VariableSection({
  title,
  description,
  glyph,
  meta,
  children,
}: {
  title: string;
  description?: string;
  glyph: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      data-page-variable-section
      className="overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-surface)]"
    >
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--border-light)] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-surface)] text-[var(--accent)]">
            {glyph}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-[var(--text-primary)]">{title}</div>
            {description ? <div className="mt-0.5 truncate text-[10px] text-[var(--text-tertiary)]">{description}</div> : null}
          </div>
        </div>
        {meta}
      </div>
      <div className="space-y-3 p-3.5">
        {children}
      </div>
    </section>
  );
}

function PageVariableSectionGlyph({ kind }: { kind: 'identity' | 'default' | 'url' }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (kind === 'identity') {
    return <svg {...common}><circle cx="5" cy="5" r="2" /><path d="M8.5 4h4M8.5 7h3M3 12h10" /></svg>;
  }
  if (kind === 'default') {
    return <svg {...common}><path d="M3 8h10M5 4.5 3 8l2 3.5M11 4.5 13 8l-2 3.5" /><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" /></svg>;
  }
  return <svg {...common}><path d="M3 5.5h4l2 5h4M9.5 4.5l3-1.5v4Z" /><path d="M3 11.5h2" /></svg>;
}

function PageVariableEmptyGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="12" cy="17" r="2" />
      <path d="M7.7 8.1 10.4 15M16.3 8.1 13.6 15M8 7h8" />
    </svg>
  );
}

function pageVariableInputClass(error?: string | null) {
  return `w-full h-8 rounded-[7px] border px-3 text-xs bg-[var(--control-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-[border-color,box-shadow,background-color] ${
    error
      ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/15'
      : 'border-[var(--border-light)] hover:border-[var(--control-border)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)]'
  }`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PageVariablesModal() {
  const isOpen = useAtomValue(pageVariablesModalOpenAtom);
  const setIsOpen = useSetAtom(pageVariablesModalOpenAtom);
  const activeFile = useAtomValue(activeFilePathAtom);
  const isComponent = isComponentFilePath(activeFile);
  const variables = useAtomValue(pageVariablesAtom);

  const onClose = useCallback(() => setIsOpen(false), [setIsOpen]);

  const [mode, setMode] = useState<Mode>('empty');
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // Form state — used in both create and view/edit
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState<PageVariableType>('number');
  const [draftDefault, setDraftDefault] = useState('1');
  const [draftQueryParam, setDraftQueryParam] = useState('');

  // ─── Reset state on open ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (variables.length > 0) {
      // Open the first variable for view by default
      const first = variables[0];
      setMode('view');
      setSelectedName(first.name);
      seedFormFromVariable(first);
    } else {
      setMode('create');
      setSelectedName(null);
      seedFormForCreate('number');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function seedFormFromVariable(v: PageVariable) {
    setDraftName(v.name);
    setDraftType(v.type);
    setDraftDefault(v.default);
    setDraftQueryParam(v.queryParam ?? '');
  }

  function seedFormForCreate(type: PageVariableType) {
    setDraftName('');
    setDraftType(type);
    setDraftDefault(defaultForType(type));
    setDraftQueryParam('');
  }

  // ─── Selected variable lookup ────────────────────────────────────────
  const selected = useMemo(
    () => (selectedName ? variables.find(v => v.name === selectedName) ?? null : null),
    [selectedName, variables],
  );

  // ─── Validation ──────────────────────────────────────────────────────
  const nameError = useMemo(() => {
    if (!draftName) return null;
    if (!CAMEL_CASE_RE.test(draftName)) return 'Must be camelCase (start lowercase, no spaces).';
    // In create mode: any existing name conflicts
    // In view mode: only conflicts with names other than the one being edited
    const conflictWith = mode === 'view' ? selectedName : null;
    if (variables.some(v => v.name === draftName && v.name !== conflictWith)) return 'A variable with that name already exists.';
    return null;
  }, [draftName, variables, mode, selectedName]);

  const queryParamError = useMemo(() => {
    if (!draftQueryParam) return null;
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(draftQueryParam)) return 'Letters, numbers, dashes and underscores only.';
    return null;
  }, [draftQueryParam]);

  const isValid = draftName.length > 0 && nameError === null && queryParamError === null;
  const dirty = mode === 'view' && selected && (
    selected.name !== draftName ||
    selected.type !== draftType ||
    selected.default !== draftDefault ||
    (selected.queryParam ?? '') !== draftQueryParam
  );

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleSelectVariable = useCallback((name: string) => {
    const v = variables.find(x => x.name === name);
    if (!v) return;
    trace.action('page-vars-modal:select', { name });
    setMode('view');
    setSelectedName(name);
    seedFormFromVariable(v);
  }, [variables]);

  const handleStartCreate = useCallback(() => {
    trace.action('page-vars-modal:start-create');
    setMode('create');
    setSelectedName(null);
    seedFormForCreate('number');
  }, []);

  const handleCreate = useCallback(() => {
    if (!isValid) return;
    const variable: PageVariable = {
      name: draftName,
      type: draftType,
      default: draftDefault,
    };
    if (draftQueryParam) variable.queryParam = draftQueryParam;
    trace.action('page-vars-modal:create', variable);
    expediteStableAtomSync();
    queueMutation({ type: 'addPageVariable', variable });
    // Switch into view mode for the freshly-created variable so the user can
    // continue tweaking it without closing the modal.
    setMode('view');
    setSelectedName(draftName);
  }, [isValid, draftName, draftType, draftDefault, draftQueryParam]);

  const handleSave = useCallback(() => {
    if (!isValid || !selected || !dirty) return;
    const updates: Partial<PageVariable> = {};
    if (selected.name !== draftName) updates.name = draftName;
    if (selected.type !== draftType) updates.type = draftType;
    if (selected.default !== draftDefault) updates.default = draftDefault;
    if ((selected.queryParam ?? '') !== draftQueryParam) updates.queryParam = draftQueryParam;
    trace.action('page-vars-modal:save', { oldName: selected.name, updates });
    expediteStableAtomSync();
    queueMutation({ type: 'updatePageVariable', oldName: selected.name, updates });
    setSelectedName(draftName); // follow the rename
  }, [isValid, dirty, selected, draftName, draftType, draftDefault, draftQueryParam]);

  const handleRemove = useCallback(() => {
    if (!selected) return;
    trace.action('page-vars-modal:remove', { name: selected.name });
    expediteStableAtomSync();
    queueMutation({ type: 'removePageVariable', name: selected.name });
    // Move selection to whatever's left, or fall to create mode if the list is now empty.
    const remaining = variables.filter(v => v.name !== selected.name);
    if (remaining.length > 0) {
      setMode('view');
      setSelectedName(remaining[0].name);
      seedFormFromVariable(remaining[0]);
    } else {
      setMode('create');
      setSelectedName(null);
      seedFormForCreate('number');
    }
  }, [selected, variables]);

  // When the user changes type mid-form, reset default to the type's default —
  // a "1" number doesn't make sense as a color, etc.
  const handleTypeChange = useCallback((newType: string) => {
    const t = newType as PageVariableType;
    setDraftType(t);
    setDraftDefault(defaultForType(t));
  }, []);

  if (isOpen) trace.fn('PageVariablesModal:render', { mode, varCount: variables.length, isComponent });

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Page Variables"
      width={680}
      headerAction={!isComponent ? (
        <span
          data-page-variables-count
          className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--border-light)] bg-[var(--accent-surface)] px-2 text-[10px] font-medium text-[var(--text-secondary)]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          {variables.length} {variables.length === 1 ? 'variable' : 'variables'}
        </span>
      ) : undefined}
    >
      {isComponent ? (
        <div className="p-8 text-center text-[var(--text-secondary)]">
          <p className="text-xs">Page variables aren't available on component files.</p>
          <p className="mt-2 text-xs opacity-60">
            Components use props instead — set them via the Properties panel.
          </p>
        </div>
      ) : (
        <div
          data-page-variables-modal
          className="flex bg-[var(--bg-surface)]"
          style={{ minHeight: '430px', maxHeight: '64vh' }}
        >
          {/* ─── Left panel ────────────────────────────────────────── */}
          <aside className="flex w-[218px] shrink-0 flex-col border-r border-[var(--border-light)] bg-[var(--bg-hover)]/10">
            <div className="p-2.5 pb-2">
              <button
                data-page-variable-new
                onClick={handleStartCreate}
                className={`relative flex w-full items-center gap-2 rounded-[8px] border px-2.5 py-2 text-left transition-[background-color,border-color,color] ${
                  mode === 'create'
                    ? 'border-[var(--accent-muted)] bg-[var(--accent-surface)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-primary)] hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {mode === 'create' ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--accent)]" /> : null}
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border ${
                  mode === 'create'
                    ? 'border-transparent bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'border-[var(--border-light)] bg-[var(--control-bg)] text-[var(--text-secondary)]'
                }`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium">New variable</span>
                  <span className="mt-0.5 block truncate text-[9px] text-[var(--text-tertiary)]">Add page state</span>
                </span>
              </button>
            </div>

            <div className="mx-3 h-px bg-[var(--border-light)]" />

            <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
              {variables.length === 0 ? (
                <div
                  data-page-variable-empty
                  className="mx-3 mt-1 rounded-[10px] border border-dashed border-[var(--border-light)] px-3 py-5 text-center"
                >
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent-surface)] text-[var(--accent)]">
                    <PageVariableEmptyGlyph />
                  </span>
                  <p className="mt-3 text-[11px] font-medium text-[var(--text-primary)]">No page variables</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-tertiary)]">Create one to drive interactions, conditions, or URL state.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1 px-2">
                  {variables.map(v => {
                    const isSelected = selectedName === v.name && mode === 'view';
                    return (
                      <button
                        key={v.name}
                        onClick={() => handleSelectVariable(v.name)}
                        className={`relative flex items-center gap-2 rounded-[8px] border px-2.5 py-2 text-left transition-[background-color,border-color,color] ${
                          isSelected
                            ? 'border-[var(--accent-muted)] bg-[var(--accent-surface)] text-[var(--text-primary)]'
                            : 'border-transparent text-[var(--text-primary)] hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        {isSelected ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--accent)]" /> : null}
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border ${
                          isSelected
                            ? 'border-transparent bg-[var(--accent)] text-[var(--accent-fg)]'
                            : 'border-[var(--border-light)] bg-[var(--control-bg)] text-[var(--text-secondary)]'
                        }`}>
                          <VariableTypeIcon iconKey={resolveVariableIconKey({ pageVarType: v.type })} size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-medium">{v.name}</span>
                          <span className="mt-0.5 block truncate text-[9px] capitalize text-[var(--text-tertiary)]">
                            {v.type}{v.queryParam ? ` · ?${v.queryParam}` : ''}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* ─── Right panel ──────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <div
                data-page-variables-editor-header
                className="mb-3 flex items-center gap-3 rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-hover)]/10 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--accent-muted)] bg-[var(--accent-surface)] text-[var(--accent)]">
                  <VariableTypeIcon iconKey={resolveVariableIconKey({ pageVarType: draftType })} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {mode === 'create' ? 'New page variable' : (draftName || 'Page variable')}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-[var(--text-tertiary)]">
                    Typed page state that can drive interactions and optionally sync from the URL.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <VariableSection
                  title="Identity"
                  description="Name the variable and choose its value type."
                  glyph={<PageVariableSectionGlyph kind="identity" />}
                >
                  <Field label="Variable name" error={nameError}>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="e.g. opacity"
                      autoFocus={mode === 'create'}
                      className={pageVariableInputClass(nameError)}
                    />
                  </Field>

                  <Field label="Type">
                    <ToolSegmentedControl
                      value={draftType}
                      onChange={handleTypeChange}
                      options={TYPE_OPTIONS}
                      size="sm"
                    />
                  </Field>
                </VariableSection>

                <VariableSection
                  title="Default value"
                  description="Used when the page does not provide another value."
                  glyph={<PageVariableSectionGlyph kind="default" />}
                  meta={(
                    <span className="rounded-full bg-[var(--accent-surface)] px-2 py-1 text-[9px] font-medium capitalize text-[var(--accent)]">
                      {draftType}
                    </span>
                  )}
                >
                  <DefaultValueControl
                    type={draftType}
                    value={draftDefault}
                    onChange={setDraftDefault}
                  />
                </VariableSection>

                <VariableSection
                  title="URL sync"
                  description="Optionally initialise this variable from a query parameter."
                  glyph={<PageVariableSectionGlyph kind="url" />}
                  meta={<span className="text-[9px] text-[var(--text-tertiary)]">optional</span>}
                >
                  <Field
                    label="Query parameter"
                    error={queryParamError}
                    hint="When set, the variable initialises from ?param=value on page load."
                  >
                    <input
                      type="text"
                      value={draftQueryParam}
                      onChange={(e) => setDraftQueryParam(e.target.value)}
                      placeholder="e.g. tab"
                      className={pageVariableInputClass(queryParamError)}
                    />
                  </Field>
                </VariableSection>
              </div>
            </div>

            {/* Footer actions */}
            <div
              data-page-variables-footer
              className="flex items-center justify-between border-t border-[var(--border-light)] bg-[var(--bg-hover)]/10 px-4 py-3"
            >
              <div>
                {mode === 'view' && selected && (
                  <button
                    onClick={handleRemove}
                    className="h-8 rounded-[7px] px-3 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    Remove variable
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {mode === 'create' && (
                  <>
                    <button
                      onClick={onClose}
                      className="h-8 rounded-[7px] border border-[var(--border-light)] bg-[var(--control-bg)] px-4 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!isValid}
                      className="h-8 rounded-[7px] bg-[var(--accent)] px-4 text-[11px] font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Create variable
                    </button>
                  </>
                )}
                {mode === 'view' && (
                  <button
                    onClick={handleSave}
                    disabled={!isValid || !dirty}
                    className="h-8 rounded-[7px] bg-[var(--accent)] px-4 text-[11px] font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save changes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Default-value control — adapts to variable type ─────────────────────────

interface DefaultValueControlProps {
  type: PageVariableType;
  value: string;
  onChange: (v: string) => void;
}

function DefaultValueControl({ type, value, onChange }: DefaultValueControlProps) {
  if (type === 'boolean') {
    return (
      <ToolSegmentedControl
        value={value === 'true' ? 'true' : 'false'}
        onChange={(v) => onChange(v)}
        options={[
          { value: 'true',  label: 'Yes' },
          { value: 'false', label: 'No'  },
        ]}
        size="sm"
      />
    );
  }
  if (type === 'color') {
    return <ColorInput value={value} onChange={onChange} />;
  }
  if (type === 'image') {
    return <ImagePickerInput value={value} onChange={onChange} />;
  }
  if (type === 'number') {
    // Slider for likely-opacity/percent values, plus a numeric input. Free-form
    // numbers (e.g. counter / pagination index) are still handled by the input;
    // the slider just covers the common 0–1 range.
    const num = parseFloat(value);
    const isOpacityish = !Number.isNaN(num) && num >= 0 && num <= 1;
    return (
      <div className="flex items-center gap-2 w-full">
        {isOpacityish && (
          <ToolSlider
            value={num}
            min={0}
            max={1}
            step={0.01}
            onChange={(n) => onChange(String(n))}
          />
        )}
        <ToolInput value={value} onChange={onChange} step={0.1} />
      </div>
    );
  }
  // text
  return <ToolInput value={value} onChange={onChange} text />;
}

// ─── Field wrapper ──────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}

function Field({ label, error, hint, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-medium text-[var(--text-secondary)]">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-[10px] text-red-500">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-[9px] leading-relaxed text-[var(--text-tertiary)]">{hint}</p> : null}
    </div>
  );
}
