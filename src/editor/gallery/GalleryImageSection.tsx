import { ToolButton, ToolInput, ToolRow, ToolSection, ToolSelect } from '@/editor/controls';
import { formatObjectPosition, parseObjectPosition } from '@/canvas/gallery/crop-math';

const FIT_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
  { value: 'none', label: 'None' },
  { value: 'scale-down', label: 'Scale down' },
];

interface GalleryImageSectionProps {
  alt: string;
  fit: string;
  objectPosition: string;
  zoom: number;
  rotation: number;
  onAltChange: (value: string) => void;
  onFitChange: (value: string) => void;
  onReposition: () => void;
  onResetPosition: () => void;
  onResetTreatment: () => void;
}

export default function GalleryImageSection({
  alt,
  fit,
  objectPosition,
  zoom,
  rotation,
  onAltChange,
  onFitChange,
  onReposition,
  onResetPosition,
  onResetTreatment,
}: GalleryImageSectionProps) {
  return (
    <ToolSection title="image" collapsible>
      <ToolRow label="Alt text">
        <ToolInput
          text
          value={alt}
          onChange={onAltChange}
          placeholder="Describe image"
          ariaLabel="gallery image alt text"
        />
      </ToolRow>
      <ToolRow label="Fit">
        <ToolSelect
          ariaLabel="gallery image fit"
          value={fit}
          onChange={onFitChange}
          options={FIT_OPTIONS}
        />
      </ToolRow>
      <ToolRow label="Position">
        <div className="flex items-center gap-1 w-full">
          <ToolButton className="flex-1" onClick={onReposition} disabled={fit !== 'cover'}>
            Reposition
          </ToolButton>
          <button
            type="button"
            className="h-[var(--control-height-sm)] px-2 border border-[var(--control-border)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:border-[var(--border-focus)]"
            onClick={onResetPosition}
            aria-label="center image position"
            title="center image position"
          >
            Center
          </button>
        </div>
      </ToolRow>
      <ToolRow label="Transform">
        <div
          className="min-w-0 truncate text-[10px] tabular-nums text-[var(--text-disabled)]"
          aria-label={'Position ' + formatObjectPosition(parseObjectPosition(objectPosition)) + ', zoom ' + Math.round(zoom * 100) + ' percent, rotation ' + (Math.round(rotation * 10) / 10) + ' degrees'}
        >
          {formatObjectPosition(parseObjectPosition(objectPosition))}
          {' · '}
          {Math.round(zoom * 100)}%
          {' · '}
          {Math.round(rotation * 10) / 10}°
        </div>
      </ToolRow>
      <ToolRow label="Treatment">
        <ToolButton className="w-full" onClick={onResetTreatment}>
          Reset pan / zoom / rotate
        </ToolButton>
      </ToolRow>
    </ToolSection>
  );
}
