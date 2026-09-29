import { useMemo, useState, type CSSProperties } from 'react';
import ImageSearchModal from '@/editor/ui/ImageSearchModal';
import { ToolSelect } from '@/editor/controls';
import {
  GALLERY_VIEWS,
  getGalleryIndexGeometryPatch,
  nextGalleryNaturalSeed,
  type GalleryViewId,
} from '@/code/gallery/gallery-views';
import type { GalleryFrameSizing } from '@/code/gallery/gallery-frame-sizing';
import ChromeTabBar from '@/editor/ui/ChromeTabBar';
import {
  appendGalleryWizardMedia,
  moveGalleryWizardMedia,
  removeGalleryWizardMedia,
  type GalleryWizardConfig,
  type GalleryWizardFit,
  type GalleryWizardStep,
} from './gallery-wizard-model';

interface GalleryCreationWizardProps {
  busy: boolean;
  error?: string | null;
  onFinish: (config: GalleryWizardConfig) => void;
  onCancel: () => void;
}

const STEPS: readonly { id: GalleryWizardStep; label: string }[] = [
  { id: 'media', label: 'Media' },
  { id: 'layout', label: 'Layout' },
  { id: 'behavior', label: 'Behavior' },
];

function Preview({
  mediaUrls,
  view,
  fit,
  naturalSeed,
}: {
  mediaUrls: readonly string[];
  view: GalleryViewId;
  fit: GalleryWizardFit;
  naturalSeed: number;
}) {
  const urls = mediaUrls.slice(0, view === 'carousel' ? 1 : view === 'natural' ? 4 : 6);
  const rootStyle = useMemo<CSSProperties>(() => {
    const base: CSSProperties = {
      minHeight: 132,
      overflow: 'hidden',
      border: '1px solid var(--border-light)',
      borderRadius: 9,
      background: 'var(--bg-base)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.015)',
    };
    if (view === 'grid') return { ...base, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 4, padding: 4 };
    if (view === 'natural') return { ...base, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridTemplateRows: 'repeat(2,60px)', gap: 3, padding: 4 };
    if (view === 'strip') return { ...base, display: 'flex', gap: 3, padding: 4 };
    if (view === 'story') return { ...base, display: 'flex', flexDirection: 'column', gap: 5, padding: 4 };
    return { ...base, display: 'grid', placeItems: 'center', padding: 8 };
  }, [view]);

  return (
    <div style={rootStyle} role="img" aria-label={'Gallery ' + view + ' preview'}>
      {urls.map((url, index) => {
        let itemStyle: CSSProperties = { overflow: 'hidden', minWidth: 0, background: 'var(--grid-line)' };
        if (view === 'grid') itemStyle = { ...itemStyle, aspectRatio: '1 / 1' };
        if (view === 'natural') {
          const geometry = getGalleryIndexGeometryPatch('natural', index, naturalSeed);
          itemStyle = { ...itemStyle, gridColumn: geometry.gridColumn, gridRow: geometry.gridRow };
        }
        if (view === 'strip') itemStyle = { ...itemStyle, width: index === 0 ? 78 : 40, minWidth: index === 0 ? 78 : 40 };
        if (view === 'story') itemStyle = { ...itemStyle, width: '100%', height: index % 2 === 0 ? 50 : 60 };
        if (view === 'carousel') itemStyle = { ...itemStyle, width: 104, height: 116 };
        return (
          <div key={url + index} style={itemStyle}>
            <img src={url} alt="" draggable={false} className="w-full h-full" style={{ objectFit: fit }} />
          </div>
        );
      })}
      {urls.length === 0 && (
        <div className="self-center justify-self-center p-4 text-center text-[10px] text-[var(--text-disabled)]">
          Choose media to preview the Gallery.
        </div>
      )}
    </div>
  );
}

export default function GalleryCreationWizard({ busy, error, onFinish, onCancel }: GalleryCreationWizardProps) {
  const [step, setStep] = useState<GalleryWizardStep>('media');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [view, setView] = useState<GalleryViewId>('grid');
  const [frameSizing, setFrameSizing] = useState<GalleryFrameSizing>('composed');
  const [fit, setFit] = useState<GalleryWizardFit>('cover');
  const [naturalSeed, setNaturalSeed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const stepIndex = STEPS.findIndex((entry) => entry.id === step);

  const addMedia = (urls: readonly string[]) => {
    setMediaUrls((current) => appendGalleryWizardMedia(current, urls));
  };

  return (
    <>
      <section className="space-y-4 p-3" aria-labelledby="gallery-creation-title">
        <div className="flex items-center justify-between gap-2">
          <h3 id="gallery-creation-title" className="text-xs font-medium text-[var(--text-primary)]">Create Gallery</h3>
          <div className="text-[10px] tabular-nums text-[var(--text-disabled)]" aria-live="polite">
            Step {stepIndex + 1} / {STEPS.length}
          </div>
        </div>

        <ChromeTabBar
          value={step}
          onChange={setStep}
          ariaLabel="Gallery creation steps"
          semantic="steps"
          stretch
          items={[
            { value: 'media', label: 'Media', glyph: 'media' },
            { value: 'layout', label: 'Layout', glyph: 'layout', disabled: busy || mediaUrls.length === 0 },
            { value: 'behavior', label: 'Behavior', glyph: 'behavior', disabled: busy || mediaUrls.length === 0 },
          ]}
        />

        {step === 'media' && (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPickerOpen(true)}
              className="h-8 w-full rounded-[7px] border border-[var(--control-border)] bg-[var(--control-bg)] text-[10px] font-medium text-[var(--text-primary)] hover:border-[var(--control-border-hover)] hover:bg-[var(--control-bg-hover)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] disabled:opacity-40"
            >
              Choose media
            </button>
            {mediaUrls.length === 0 ? (
              <div data-gallery-empty-state className="flex min-h-[118px] flex-col items-center justify-center rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 p-5 text-center">
                <span className="flex h-9 w-11 items-center justify-center rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-hover)]/40 text-[var(--accent)]">
                  <svg aria-hidden width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="m4 11 2.7-2.7L9 10.5l1.5-1.5 2.1 2.1"/></svg>
                </span>
                <span className="mt-2 text-[10px] font-medium text-[var(--text-primary)]">Choose media to begin</span>
                <span className="mt-1 text-[9px] text-[var(--text-tertiary)]">Select one or more images, then shape the layout and behavior.</span>
              </div>
            ) : (
              <div className="space-y-1" role="list" aria-label="Selected Gallery media">
                {mediaUrls.map((url, index) => (
                  <div key={url} role="listitem" className="flex h-11 items-center gap-2 rounded-[7px] border border-[var(--control-border)] bg-[var(--bg-surface)]/55 px-2">
                    <img src={url} alt="" draggable={false} className="h-8 w-10 rounded-[4px] object-cover" />
                    <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--text-secondary)]">{url.split('/').pop() || 'Image'}</span>
                    <button
                      type="button"
                      aria-label={'Move image ' + (index + 1) + ' up'}
                      title="Move up"
                      disabled={busy || index === 0}
                      onClick={() => setMediaUrls((current) => moveGalleryWizardMedia(current, index, -1))}
                      className="w-6 h-6 flex items-center justify-center border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] disabled:opacity-30"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m2.5 6.5 2.5-3 2.5 3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label={'Move image ' + (index + 1) + ' down'}
                      title="Move down"
                      disabled={busy || index === mediaUrls.length - 1}
                      onClick={() => setMediaUrls((current) => moveGalleryWizardMedia(current, index, 1))}
                      className="w-6 h-6 flex items-center justify-center border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] disabled:opacity-30"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m2.5 3.5 2.5 3 2.5-3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label={'Remove image ' + (index + 1)}
                      title="Remove"
                      disabled={busy}
                      onClick={() => setMediaUrls((current) => removeGalleryWizardMedia(current, index))}
                      className="w-6 h-6 flex items-center justify-center border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] disabled:opacity-30"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
                        <path d="m2 2 6 6M8 2 2 8" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'layout' && (
          <div className="space-y-2">
            <ToolSelect
              ariaLabel="Initial Gallery view"
              value={view}
              disabled={busy}
              onChange={(value) => setView(value as GalleryViewId)}
              options={GALLERY_VIEWS.map((entry) => ({ value: entry.id, label: entry.label }))}
            />
            <Preview mediaUrls={mediaUrls} view={view} fit={fit} naturalSeed={naturalSeed} />
          </div>
        )}

        {step === 'behavior' && (
          <div className="space-y-2">
            <ToolSelect
              ariaLabel="Initial Gallery frame sizing"
              value={frameSizing}
              disabled={busy}
              onChange={(value) => setFrameSizing(value as GalleryFrameSizing)}
              options={[
                { value: 'composed', label: 'Composed' },
                { value: 'source', label: 'Source ratio' },
              ]}
            />
            <ToolSelect
              ariaLabel="Initial Gallery media fit"
              value={fit}
              disabled={busy}
              onChange={(value) => setFit(value as GalleryWizardFit)}
              options={[
                { value: 'cover', label: 'Cover' },
                { value: 'contain', label: 'Contain' },
              ]}
            />
            {view === 'natural' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setNaturalSeed((seed) => nextGalleryNaturalSeed(seed))}
                className="h-7 w-full border border-[var(--control-border)] text-[10px] text-[var(--text-primary)] hover:border-[var(--control-border-hover)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] disabled:opacity-40"
              >
                Shuffle Natural composition
              </button>
            )}
            <Preview mediaUrls={mediaUrls} view={view} fit={fit} naturalSeed={naturalSeed} />
          </div>
        )}

        {error && <div role="alert" className="text-[10px] text-[var(--text-secondary)]">{error}</div>}

        <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
          <button type="button" disabled={busy} onClick={onCancel} className="h-7 px-2 border border-transparent text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] disabled:opacity-40">Cancel</button>
          <div className="flex gap-1">
            {stepIndex > 0 && (
              <button type="button" disabled={busy} onClick={() => setStep(STEPS[stepIndex - 1].id)} className="h-7 border border-[var(--control-border)] px-2 text-[10px] hover:border-[var(--control-border-hover)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] disabled:opacity-40">Back</button>
            )}
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={busy || mediaUrls.length === 0}
                onClick={() => setStep(STEPS[stepIndex + 1].id)}
                className="h-7 border border-[var(--border-focus)] bg-[var(--choice-bg)] px-3 text-[10px] hover:border-[var(--control-border-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)] disabled:opacity-40"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || mediaUrls.length === 0}
                onClick={() => onFinish({ mediaUrls, view, frameSizing, fit, naturalSeed })}
                className="h-7 border border-[var(--border-focus)] bg-[var(--choice-bg)] px-3 text-[10px] hover:border-[var(--control-border-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)] disabled:opacity-40"
              >
                {busy ? 'Creating…' : 'Finish'}
              </button>
            )}
          </div>
        </div>
      </section>

      <ImageSearchModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectionMode="multiple"
        onSelect={(url) => addMedia([url])}
        onSelectMany={(urls) => addMedia(urls)}
      />
    </>
  );
}
