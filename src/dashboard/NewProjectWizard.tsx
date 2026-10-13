import { useEffect, useMemo, useRef, useState } from 'react';
import type { FieldProjectMeta } from '@/backend/field-projects';
import {
  DEFAULT_NEW_PROJECT_SETTINGS,
  NEW_PROJECT_CANVAS_PRESETS,
  NEW_PROJECT_STYLE_SETS,
  availableResponsiveCanvasPresets,
  normalizeProjectColor,
  type NewProjectSettings,
  type NewProjectStyleSetId,
} from './new-project-model';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (settings: NewProjectSettings) => Promise<FieldProjectMeta>;
  onDone: (project: FieldProjectMeta) => void;
}

export default function NewProjectWizard({ open, onClose, onCreate, onDone }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<NewProjectSettings>({ ...DEFAULT_NEW_PROJECT_SETTINGS });
  const [pageColorTouched, setPageColorTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneProject, setDoneProject] = useState<FieldProjectMeta | null>(null);
  const doneTimerRef = useRef<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const responsiveOptions = useMemo(
    () => availableResponsiveCanvasPresets(draft.canvasPresetId),
    [draft.canvasPresetId],
  );

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDraft({ ...DEFAULT_NEW_PROJECT_SETTINGS, additionalViewportIds: [] });
    setPageColorTouched(false);
    setSaving(false);
    setError(null);
    setDoneProject(null);
  }, [open]);

  useEffect(() => {
    if (!open || saving || doneProject) return;
    const frame = requestAnimationFrame(() => {
      if (step === 1) {
        nameRef.current?.focus();
        nameRef.current?.select();
        return;
      }
      titleRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [doneProject, open, saving, step]);

  useEffect(() => () => {
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current);
  }, []);

  useEffect(() => {
    if (!open || saving || doneProject) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [doneProject, onClose, open, saving]);

  if (!open) return null;

  const setCanvasPreset = (canvasPresetId: NewProjectSettings['canvasPresetId']) => {
    const allowed = new Set(availableResponsiveCanvasPresets(canvasPresetId).map((preset) => preset.id));
    setDraft((current) => ({
      ...current,
      canvasPresetId,
      additionalViewportIds: current.additionalViewportIds.filter((id) => allowed.has(id)),
    }));
  };

  const setStyleSet = (styleSetId: NewProjectStyleSetId) => {
    const styleSet = NEW_PROJECT_STYLE_SETS.find((candidate) => candidate.id === styleSetId);
    setDraft((current) => ({
      ...current,
      styleSetId,
      pageColor: !pageColorTouched && styleSet ? styleSet.suggestedPageColor : current.pageColor,
    }));
  };

  const create = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const settings: NewProjectSettings = {
      ...draft,
      name: draft.name.trim() || 'Untitled',
      pageColor: normalizeProjectColor(draft.pageColor),
    };
    try {
      const project = await onCreate(settings);
      setDoneProject(project);
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      doneTimerRef.current = window.setTimeout(() => {
        doneTimerRef.current = null;
        onDone(project);
      }, reduceMotion ? 180 : 520);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setSaving(false);
    }
  };

  if (doneProject) {
    return (
      <div className="field-new-project-backdrop" role="presentation">
        <div className="field-new-project-modal field-new-project-done" role="status" aria-live="polite">
          <span className="field-new-project-done-mark" aria-hidden="true">
            <svg viewBox="0 0 20 20"><path d="m5 10.2 3.1 3.1L15.2 6" /></svg>
          </span>
          <div>
            <strong>Done</strong>
            <span>Opening {doneProject.name || 'Untitled'}…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="field-new-project-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        className="field-new-project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-new-project-title"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <header className="field-new-project-head">
          <div>
            <span className="field-new-project-eyebrow">New project</span>
            <h2 ref={titleRef} tabIndex={-1} id="field-new-project-title">{step === 1 ? 'Start with the essentials' : 'Responsive canvases'}</h2>
          </div>
          <span className="field-new-project-step">{step} / 2</span>
        </header>

        {step === 1 ? (
          <div className="field-new-project-body">
            <label className="field-new-project-field">
              <span>Project name</span>
              <input
                ref={nameRef}
                value={draft.name}
                maxLength={200}
                disabled={saving}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Untitled"
              />
            </label>

            <fieldset className="field-new-project-fieldset" disabled={saving}>
              <legend>Starting canvas</legend>
              <div className="field-new-project-canvas-grid">
                {NEW_PROJECT_CANVAS_PRESETS.map((preset) => (
                  <label key={preset.id} className="field-new-project-canvas-option" data-selected={draft.canvasPresetId === preset.id ? 'true' : 'false'}>
                    <input
                      type="radio"
                      name="canvas-preset"
                      value={preset.id}
                      checked={draft.canvasPresetId === preset.id}
                      onChange={() => setCanvasPreset(preset.id)}
                    />
                    <span className="field-new-project-screen" style={{ aspectRatio: `${preset.width} / ${preset.height}` }} />
                    <span className="field-new-project-option-copy">
                      <strong>{preset.label}</strong>
                      <small>{preset.detail}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field-new-project-row">
              <label className="field-new-project-field">
                <span>Page color</span>
                <div className="field-new-project-color-control">
                  <input
                    className="field-new-project-color-swatch"
                    type="color"
                    value={normalizeProjectColor(draft.pageColor)}
                    disabled={saving}
                    aria-label="Page color"
                    onChange={(event) => {
                      setPageColorTouched(true);
                      setDraft((current) => ({ ...current, pageColor: event.target.value }));
                    }}
                  />
                  <input
                    className="field-new-project-color-text"
                    value={draft.pageColor}
                    disabled={saving}
                    spellCheck={false}
                    aria-label="Page color hex value"
                    onChange={(event) => {
                      setPageColorTouched(true);
                      setDraft((current) => ({ ...current, pageColor: event.target.value }));
                    }}
                    onBlur={() => setDraft((current) => ({ ...current, pageColor: normalizeProjectColor(current.pageColor) }))}
                  />
                </div>
              </label>
            </div>

            <fieldset className="field-new-project-fieldset" disabled={saving}>
              <legend>Style set <span>optional</span></legend>
              <div className="field-new-project-style-grid">
                {NEW_PROJECT_STYLE_SETS.map((styleSet) => (
                  <label key={styleSet.id} className="field-new-project-style-option" data-selected={draft.styleSetId === styleSet.id ? 'true' : 'false'}>
                    <input
                      type="radio"
                      name="style-set"
                      value={styleSet.id}
                      checked={draft.styleSetId === styleSet.id}
                      onChange={() => setStyleSet(styleSet.id)}
                    />
                    <span className="field-new-project-style-dot" style={{ background: styleSet.suggestedPageColor }} />
                    <span>
                      <strong>{styleSet.label}</strong>
                      <small>{styleSet.detail}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <div className="field-new-project-body">
            <p className="field-new-project-help">
              Optional smaller responsive canvases start beside the primary canvas and share its page height. You can add, resize, or remove viewports later.
            </p>
            {responsiveOptions.length > 0 ? (
              <div className="field-new-project-responsive-list">
                {responsiveOptions.map((preset) => {
                  const checked = draft.additionalViewportIds.includes(preset.id);
                  return (
                    <label key={preset.id} className="field-new-project-responsive-option" data-selected={checked ? 'true' : 'false'}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving}
                        onChange={(event) => {
                          setDraft((current) => ({
                            ...current,
                            additionalViewportIds: event.target.checked
                              ? [...current.additionalViewportIds, preset.id]
                              : current.additionalViewportIds.filter((id) => id !== preset.id),
                          }));
                        }}
                      />
                      <span className="field-new-project-screen field-new-project-screen-small" style={{ aspectRatio: `${preset.width} / ${preset.height}` }} />
                      <span>
                        <strong>{preset.label}</strong>
                        <small>{preset.width}px responsive width</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="field-new-project-no-responsive">
                Your starting canvas is already the smallest preset. Add larger or custom viewports later from Canvas.
              </div>
            )}
            <div className="field-new-project-template-note">
              <span>Templates</span>
              <p>Blank project for now. Template selection can join this step later without changing the creation model.</p>
            </div>
          </div>
        )}

        {error && <div className="field-new-project-error" role="alert">{error}</div>}

        <footer className="field-new-project-actions">
          <button type="button" className="field-new-project-secondary" disabled={saving} onClick={step === 1 ? onClose : () => setStep(1)}>
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <div className="field-new-project-actions-right">
            {step === 1 && responsiveOptions.length > 0 && (
              <button type="button" className="field-new-project-secondary" disabled={saving} onClick={() => setStep(2)}>
                More options
              </button>
            )}
            <button type="submit" className="field-new-project-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
