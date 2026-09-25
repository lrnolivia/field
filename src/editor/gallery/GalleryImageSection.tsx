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
  onAltChange: (value: string) => void;
  onFitChange: (value: string) => void;
  onReposition: () => void;
  onResetPosition: () => void;
}

export default function GalleryImageSection({
  alt,
  fit,
  objectPosition,
  onAltChange,
  onFitChange,
  onReposition,
  onResetPosition,
}: GalleryImageSectionProps) {
  return (
    <ToolSection title="Image" collapsible>
      <ToolRow label="Alt text">
        <ToolInput
          text
          value={alt}
          onChange={onAltChange}
          placeholder="Describe image"
          ariaLabel="Gallery image alt text"
        />
      </ToolRow>
      <ToolRow label="Fit">
        <ToolSelect
          ariaLabel="Gallery image fit"
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
            className="h-[var(--control-height-sm)] px-2 border border-[var(--control-border)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={onResetPosition}
            title="Reset image position"
          >
            Reset
          </button>
        </div>
      </ToolRow>
      <div className="text-[10px] tabular-nums text-[var(--text-disabled)]">
        {formatObjectPosition(parseObjectPosition(objectPosition))}
      </div>
    </ToolSection>
  );
}
