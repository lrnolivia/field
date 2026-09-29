import { useEffect, type ReactNode } from 'react';
import {
  AnimationIcon,
  ColorIcon,
  GradientIcon,
  GridIcon,
  ImageIcon,
  VideoIcon,
} from '@/design-system/PropertyIcons';

export type PaintType = 'solid' | 'gradient' | 'pattern' | 'image' | 'video' | 'shader';
export type PaintPickerSurface = 'custom' | 'libraries';

export const PAINT_TYPE_ORDER: PaintType[] = ['solid', 'gradient', 'pattern', 'image', 'video', 'shader'];
export const ALL_PAINT_TYPES = new Set<PaintType>(PAINT_TYPE_ORDER);
export const SOLID_ONLY_PAINT_TYPES = new Set<PaintType>(['solid']);

interface Props {
  surface: PaintPickerSurface;
  onSurfaceChange: (surface: PaintPickerSurface) => void;
  activeType: PaintType;
  onTypeChange: (type: PaintType) => void;
  supportedTypes: ReadonlySet<PaintType>;
  contextLabel?: string;
  onClose?: () => void;
  onPlus?: () => void;
  children: ReactNode;
}

const LABELS: Record<PaintType, string> = {
  solid: 'Solid',
  gradient: 'Gradient',
  pattern: 'Pattern',
  image: 'Image',
  video: 'Video',
  shader: 'Shader',
};

function PaintIcon({ type }: { type: PaintType }) {
  const common = { width: 18, height: 18, bg: 'transparent', iconColor: 'currentColor' };
  if (type === 'solid') return <ColorIcon {...common} />;
  if (type === 'gradient') return <GradientIcon {...common} />;
  if (type === 'pattern') return <GridIcon {...common} />;
  if (type === 'image') return <ImageIcon {...common} />;
  if (type === 'video') return <VideoIcon {...common} />;
  return <AnimationIcon {...common} />;
}

export default function PaintPickerShell({
  surface,
  onSurfaceChange,
  activeType,
  onTypeChange,
  supportedTypes,
  contextLabel = 'this property',
  onClose,
  onPlus,
  children,
}: Props) {
  useEffect(() => {
    if (supportedTypes.has(activeType)) return;
    const fallback = PAINT_TYPE_ORDER.find(type => supportedTypes.has(type));
    if (fallback) onTypeChange(fallback);
  }, [activeType, supportedTypes, onTypeChange]);

  return (
    <div data-paint-picker-shell className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)]">
      <div className="h-[56px] px-4 flex items-center justify-between border-b border-[var(--border-light)] select-none">
        <div className="flex items-center gap-1">
          {(['custom', 'libraries'] as const).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => onSurfaceChange(item)}
              aria-pressed={surface === item}
              className={`h-9 px-3 rounded-[9px] text-[13px] font-medium transition-colors ${
                surface === item
                  ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {item === 'custom' ? 'Custom' : 'Libraries'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPlus ?? (() => onSurfaceChange('libraries'))}
            className="w-9 h-9 flex items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Open libraries"
            aria-label="Open libraries"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={!onClose}
            className="w-9 h-9 flex items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-35 disabled:hover:bg-transparent"
            title="Close paint picker"
            aria-label="Close paint picker"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      <div className="h-[64px] px-4 flex items-center gap-2 border-b border-[var(--border-light)]" role="toolbar" aria-label="Paint type">
        {PAINT_TYPE_ORDER.map(type => {
          const supported = supportedTypes.has(type);
          const active = supported && activeType === type;
          const disabledTitle = `${LABELS[type]} isn’t supported for ${contextLabel}.`;
          return (
            <button
              key={type}
              type="button"
              disabled={!supported}
              aria-pressed={active}
              aria-label={LABELS[type]}
              title={supported ? LABELS[type] : disabledTitle}
              onClick={() => supported && onTypeChange(type)}
              className={`w-10 h-10 rounded-[8px] flex items-center justify-center border transition-colors ${
                active
                  ? 'bg-[var(--bg-selected)] border-[var(--control-border-hover)] text-[var(--text-primary)]'
                  : supported
                    ? 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    : 'border-transparent text-[var(--text-disabled)] opacity-35 cursor-not-allowed'
              }`}
              data-paint-type={type}
              data-supported={supported ? 'true' : 'false'}
            >
              <PaintIcon type={type} />
            </button>
          );
        })}
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}
