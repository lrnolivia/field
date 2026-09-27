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
      background: 'var(--bg-base)',
    };
    if (view === 'grid') return { ...base, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 4, padding: 4 };
    if (view === 'natural') return { ...base, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridTemplateRows: 'repeat(2,60px)', gap: 3, padding: 4 };
    if (view === 'strip') return { ...base, display: 'flex', gap: 3, padding: 4 };
    if (view === 'story') return { ...base, display: 'flex', flexDirection: 'column', gap: 5, padding: 4 };
    return { ...base, display: 'grid', placeItems: 'center', padding: 8 };
  }, [view]);

  return (
    <div style={rootStyle} aria-label={'Gallery ' + view + ' preview'}>
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
      <div className="space-y-4 p-3">
        <div>
          <div className="text-xs font-medium text-[var(--text-primary)]">Create Gallery</div>
          <div className="text-[10px] text-[var(--text-disabled)]">Media → Layout → Behavior</div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {STEPS.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              disabled={busy || (index > 0 && mediaUrls.length === 0)}
              onClick={() => setStep(entry.id)}
              className={
                'h-7 border px-2 text-[10px] disabled:opacity-40 ' +
                (entry.id === step
                  ? 'border-[var(--border-focus)] bg-[var(--choice-bg)] text-[var(--text-primary)]'
                  : 'border-[var(--control-border)] text-[var(--text-secondary)]')
              }
            >
              {index + 1}. {entry.label}
            </button>
          ))}
        </div>

        {step === 'media' && (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPickerOpen(true)}
              className="h-7 w-full border border-[var(--control-border)] text-[10px] text-[var(--text-primary)] disabled:opacity-40"
            >
              Choose media
            </button>
            {mediaUrls.length === 0 ? (
              <div className="border border-dashed border-[var(--control-border)] p-5 text-center text-[10px] text-[var(--text-disabled)]">
                Select at least one image to continue.
              </div>
            ) : (
              <div className="space-y-1">
                {mediaUrls.map((url, index) => (
                  <div key={url} className="flex h-9 items-center gap-2 border border-[var(--control-border)] px-2">
                    <img src={url} alt="" draggable={false} className="h-6 w-6 object-cover" />
                    <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--text-secondary)]">{url.split('/').pop() || 'Image'}</span>
                    <button type="button" disabled={busy || index === 0} onClick={() => setMediaUrls((current) => moveGalleryWizardMedia(current, index, -1))}>↑</button>
                    <button type="button" disabled={busy || index === mediaUrls.length - 1} onClick={() => setMediaUrls((current) => moveGalleryWizardMedia(current, index, 1))}>↓</button>
                    <button type="button" disabled={busy} onClick={() => setMediaUrls((current) => removeGalleryWizardMedia(current, index))}>×</button>
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
                className="h-7 w-full border border-[var(--control-border)] text-[10px] text-[var(--text-primary)] disabled:opacity-40"
              >
                Shuffle Natural composition
              </button>
            )}
            <Preview mediaUrls={mediaUrls} view={view} fit={fit} naturalSeed={naturalSeed} />
          </div>
        )}

        {error && <div role="alert" className="text-[10px] text-[var(--text-secondary)]">{error}</div>}

        <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
          <button type="button" disabled={busy} onClick={onCancel} className="h-7 px-2 text-[10px] text-[var(--text-secondary)]">Cancel</button>
          <div className="flex gap-1">
            {stepIndex > 0 && (
              <button type="button" disabled={busy} onClick={() => setStep(STEPS[stepIndex - 1].id)} className="h-7 border border-[var(--control-border)] px-2 text-[10px]">Back</button>
            )}
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={busy || mediaUrls.length === 0}
                onClick={() => setStep(STEPS[stepIndex + 1].id)}
                className="h-7 border border-[var(--border-focus)] bg-[var(--choice-bg)] px-3 text-[10px] disabled:opacity-40"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || mediaUrls.length === 0}
                onClick={() => onFinish({ mediaUrls, view, frameSizing, fit, naturalSeed })}
                className="h-7 border border-[var(--border-focus)] bg-[var(--choice-bg)] px-3 text-[10px] disabled:opacity-40"
              >
                {busy ? 'Creating…' : 'Finish'}
              </button>
            )}
          </div>
        </div>
      </div>

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
