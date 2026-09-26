import { ToolButton, ToolInput, ToolRow, ToolSection, ToolSelect } from '@/editor/controls';
import { GALLERY_VIEWS, type GalleryViewId } from '@/code/gallery/gallery-views';

interface GalleryViewSectionProps {
  currentView: GalleryViewId;
  styles: Record<string, string>;
  stripHeight: string;
  onViewChange: (view: GalleryViewId) => void;
  onRootStyleChange: (property: string, value: string) => void;
  onAllItemStyleChange: (styles: Record<string, string>) => void;
  onShuffleNatural: () => void;
  canShuffleNatural: boolean;
}

function px(value: string, fallback: number): string {
  const numeric = Number.parseFloat(value);
  return `${Number.isFinite(numeric) ? Math.max(0, numeric) : fallback}px`;
}

function parseColumnCount(value: string | undefined): number {
  const match = value?.match(/repeat\((\d+)/);
  return match ? Math.max(1, Number.parseInt(match[1], 10)) : 3;
}

export default function GalleryViewSection({
  currentView,
  styles,
  stripHeight,
  onViewChange,
  onRootStyleChange,
  onAllItemStyleChange,
  onShuffleNatural,
  canShuffleNatural,
}: GalleryViewSectionProps) {
  return (
    <ToolSection title="View" collapsible>
      <ToolRow label="View">
        <ToolSelect
          ariaLabel="Gallery view"
          value={currentView}
          onChange={(value) => onViewChange(value as GalleryViewId)}
          options={GALLERY_VIEWS.map((view) => ({
            value: view.id,
            label: view.status === 'deferred' ? `${view.label} — runtime later` : view.label,
            disabled: view.status === 'deferred',
          }))}
        />
      </ToolRow>

      {(currentView === 'grid' || currentView === 'natural') && (
        <ToolRow label="Gap">
          <ToolInput
            value={styles.gap || (currentView === 'grid' ? '24px' : '4px')}
            onChange={(value) => onRootStyleChange('gap', px(value, currentView === 'grid' ? 24 : 4))}
            min={0}
            chevronLabel="px"
            ariaLabel="Gallery gap"
          />
        </ToolRow>
      )}

      {currentView === 'natural' && (
        <>
          <ToolRow label="Composition">
            <ToolButton onClick={onShuffleNatural} disabled={!canShuffleNatural}>Shuffle</ToolButton>
          </ToolRow>
          <div className="text-[10px] leading-snug text-[var(--text-disabled)]">
            Shuffle changes the Natural composition without changing media or reading order.
          </div>
        </>
      )}

      {currentView === 'grid' && (
        <ToolRow label="Columns">
          <ToolInput
            value={String(parseColumnCount(styles.gridTemplateColumns))}
            onChange={(value) => {
              const count = Math.max(1, Math.min(12, Math.round(Number.parseFloat(value) || 3)));
              onRootStyleChange('gridTemplateColumns', `repeat(${count}, minmax(0, 1fr))`);
            }}
            min={1}
            max={12}
            ariaLabel="Gallery columns"
          />
        </ToolRow>
      )}

      {currentView === 'strip' && (
        <>
          <ToolRow label="Gap">
            <ToolInput
              value={styles.gap || '4px'}
              onChange={(value) => onRootStyleChange('gap', px(value, 4))}
              min={0}
              chevronLabel="px"
              ariaLabel="Strip gap"
            />
          </ToolRow>
          <ToolRow label="Height">
            <ToolInput
              value={stripHeight || '620px'}
              onChange={(value) => onAllItemStyleChange({ height: px(value, 620) })}
              min={40}
              chevronLabel="px"
              ariaLabel="Strip height"
            />
          </ToolRow>
          <div className="text-[10px] leading-snug text-[var(--text-disabled)]">
            Horizontal image strips expand on hover. Height can vary by breakpoint.
          </div>
        </>
      )}

      {currentView === 'story' && (
        <>
          <ToolRow label="Gap">
            <ToolInput
              value={styles.gap || '54px'}
              onChange={(value) => onRootStyleChange('gap', px(value, 54))}
              min={0}
              chevronLabel="px"
              ariaLabel="Story gap"
            />
          </ToolRow>
          <ToolRow label="Max width">
            <ToolInput
              value={styles.maxWidth || '1240px'}
              onChange={(value) => onRootStyleChange('maxWidth', px(value, 1240))}
              min={240}
              chevronLabel="px"
              ariaLabel="Story max width"
            />
          </ToolRow>
        </>
      )}

      {currentView === 'carousel' && (
        <div className="text-[10px] leading-snug text-[var(--text-disabled)]">
          Native scroll-snap carousel with source-backed previous/next controls. Order and counters follow Gallery content.
        </div>
      )}

      <div className="text-[10px] leading-snug text-[var(--text-disabled)]">
        Layout settings use field's responsive overrides. View identity stays shared across breakpoints.
      </div>
    </ToolSection>
  );
}
